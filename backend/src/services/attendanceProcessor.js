import Employee from "../models/employeeModel.js";
import Attendance from "../models/attendanceModel.js";
import BiometricTransaction from "../models/biometricTransactionModel.js";
import {
  getShiftRules,
  calculateLateTier,
  getApprovedLeavesMap,
  isLeave,
  assignPunchesToShiftDays,
  summarizeShiftDay
} from "../utils/attendanceUtils.js";

// Shift occurrences can reach into the adjacent calendar days (e.g. 09:00-03:00 ends
// tomorrow), so the full set of an employee's punches is loaded with this much slack on
// each side of the batch being processed.
const LOOKAROUND_MS = 3 * 24 * 60 * 60 * 1000;

class AttendanceProcessor {
  /**
   * Processes an array of raw biometric transactions into Attendance records.
   *
   * Punches are bucketed into SHIFT OCCURRENCES using each employee's shift Master
   * (startTime/endTime), not calendar days - see assignPunchesToShiftDays in
   * attendanceUtils.js. The Attendance row's `date` is the date the shift STARTED on,
   * so a check-out after midnight stays on the same row as its check-in.
   *
   * @param {Array} transactions Array of biometric transactions
   * @param {Object} [options]
   * @param {boolean} [options.dryRun=false] Compute and report what would change, write nothing
   * @returns {Promise<Object>} counts of created, updated, skipped, unmapped badges (+ diffs when dryRun)
   */
  async processTransactions(transactions, { dryRun = false, returnKeys = false } = {}) {
    const stats = {
      created: 0,
      updated: 0,
      skipped: 0,
      unmappedBadges: new Set()
    };
    const diffs = [];
    const touchedKeys = new Set(); // "<employeeId>_<shiftDate>" of every occurrence this batch touched

    if (!transactions || transactions.length === 0) {
      return stats;
    }

    // 1. Collect badges, the batch's time span and a lookup of the batch's own punches.
    const employeeCodes = new Set();
    const batchKeys = new Set();
    const nameByBadge = {};
    let minTs = Infinity;
    let maxTs = -Infinity;

    for (const txn of transactions) {
      if (!txn.badgeNumber || !txn.timestamp) continue;
      const code = txn.badgeNumber.trim();
      const ms = new Date(txn.timestamp).getTime();
      employeeCodes.add(code);
      batchKeys.add(`${code}_${ms}`);
      if (ms < minTs) minTs = ms;
      if (ms > maxTs) maxTs = ms;
      if (!nameByBadge[code] && txn.rawData?.EmployeeName) {
        nameByBadge[code] = txn.rawData.EmployeeName; // Capture name from BioCloud
      }
    }

    if (employeeCodes.size === 0) {
      return stats;
    }

    // 2. Fetch employees by badgeNumber field for matching. Some employees never got
    // badgeNumber backfilled and instead have the device's badge value sitting in `code`
    // (e.g. code: "R106") - fall back to matching on `code` for those.
    const codesArray = Array.from(employeeCodes);
    const employeesList = await Employee.find({
      $or: [
        { badgeNumber: { $in: codesArray } },
        { code: { $in: codesArray } }
      ]
    });
    const leaveMap = await getApprovedLeavesMap(employeesList);
    const findEmployee = (badge) => employeesList.find(e =>
      (e.badgeNumber && e.badgeNumber.trim() === badge) ||
      (e.code && e.code.trim() === badge)
    );

    // 3. Load each badge's FULL set of stored punches around the batch, not just the batch.
    // Check-in and check-out routinely land in separate sync batches, and a shift's
    // check-out can arrive hours after midnight, so an occurrence can only be resolved
    // from all of its punches. Batch punches are merged in too, in case the caller hasn't
    // persisted them yet.
    const stored = await BiometricTransaction.find({
      badgeNumber: { $in: codesArray },
      timestamp: { $gte: new Date(minTs - LOOKAROUND_MS), $lte: new Date(maxTs + LOOKAROUND_MS) }
    }).select("badgeNumber timestamp").sort({ timestamp: 1 }).lean();

    const punchesByBadge = {};
    const seen = new Set();
    const addPunch = (badge, timestamp) => {
      const ms = new Date(timestamp).getTime();
      const key = `${badge}_${ms}`;
      if (seen.has(key)) return;
      seen.add(key);
      (punchesByBadge[badge] ||= []).push({ timestamp: new Date(ms) });
    };
    for (const p of stored) addPunch(p.badgeNumber.trim(), p.timestamp);
    for (const txn of transactions) {
      if (txn.badgeNumber && txn.timestamp) addPunch(txn.badgeNumber.trim(), txn.timestamp);
    }

    const rulesCache = new Map();
    const getRulesCached = async (shiftName) => {
      if (!rulesCache.has(shiftName)) rulesCache.set(shiftName, await getShiftRules(shiftName));
      return rulesCache.get(shiftName);
    };

    // 4. Process each badge's shift occurrences that this batch touched.
    for (const badge of codesArray) {
      const employee = findEmployee(badge);

      if (!employee) {
        console.warn(`[AttendanceProcessor] Employee with badge number ${badge} not found.`);
        stats.unmappedBadges.add(badge);
        continue;
      }

      const shiftName = employee.shift || "Day Shift";
      const rules = await getRulesCached(shiftName);

      const punches = (punchesByBadge[badge] || []).sort((a, b) => a.timestamp - b.timestamp);
      const occurrences = assignPunchesToShiftDays(punches, rules);

      // HRMS is the source of truth for employee name - only auto-fill from BioCloud
      // when the HRMS record has no name at all (e.g. a brand-new employee whose
      // profile hasn't been filled in yet). Never overwrite a name HR has already
      // set: this used to fire on every sync whenever the two differed at all,
      // which silently reverted deliberate name edits (including case changes)
      // back to whatever the device has on file the next time that employee badged in.
      if (nameByBadge[badge] && !employee.name?.trim() && !dryRun) {
        console.log(`[AttendanceProcessor] Filling blank employee name from BioCloud: "${nameByBadge[badge]}" for badge ${badge} (${employee.code})`);
        employee.name = nameByBadge[badge].trim();
        await employee.save();
      }

      for (const [shiftDate, occPunches] of occurrences) {
        // Only occurrences containing a punch from this batch need (re)writing.
        if (!occPunches.some(p => batchKeys.has(`${badge}_${p.timestamp.getTime()}`))) continue;
        touchedKeys.add(`${employee._id}_${shiftDate}`);

        // Check if employee has approved leave request for this date
        if (isLeave(employee._id, shiftDate, leaveMap)) {
          console.log(`[AttendanceProcessor SKIP] ${badge} on ${shiftDate} is on Approved Leave.`);
          stats.skipped++;
          continue;
        }

        // Check if existing attendance record is "On Leave"
        const existingRecord = await Attendance.findOne({ employee: employee._id, date: shiftDate });
        if (existingRecord && existingRecord.status === "On Leave") {
          console.log(`[AttendanceProcessor SKIP] ${badge} on ${shiftDate} status is already On Leave.`);
          stats.skipped++;
          continue;
        }

        const summary = summarizeShiftDay(shiftDate, occPunches, rules);

        let status = "Present";
        let lateTier = 0;
        if (summary.checkIn) {
          lateTier = calculateLateTier(summary.checkIn, rules);
          status = lateTier > 0 ? "Late" : "Present";
        }
        // Still clocked in (no completed check-out) after the shift's window has ended:
        // the employee never badged out - flag it instead of quietly calling it
        // Present/Late. While the window is still running it is just a shift in progress.
        if (summary.isOpen && Date.now() > summary.window.end.getTime()) {
          status = "Incomplete";
        }

        if (existingRecord) {
          // If times are already identical, skip to prevent unnecessary writes/triggers
          if (
            existingRecord.checkIn === summary.checkIn &&
            existingRecord.checkOut === summary.checkOut &&
            !!existingRecord.checkOutNextDay === summary.checkOutNextDay &&
            existingRecord.status === status &&
            existingRecord.lateTier === lateTier &&
            existingRecord.workHours === summary.workHours
          ) {
            stats.skipped++;
            continue;
          }

          // If manually edited, preserve manual edit details
          if (existingRecord.isManuallyEdited) {
            console.log(`[AttendanceProcessor SKIP] ${badge} on ${shiftDate} was manually edited. Skipping.`);
            stats.skipped++;
            continue;
          }

          if (dryRun) {
            diffs.push({
              employee: employee.name, code: employee.code, date: shiftDate,
              before: { checkIn: existingRecord.checkIn, checkOut: existingRecord.checkOut, status: existingRecord.status },
              after: { checkIn: summary.checkIn, checkOut: summary.checkOut, nextDay: summary.checkOutNextDay, status }
            });
          } else {
            existingRecord.checkIn = summary.checkIn;
            existingRecord.checkOut = summary.checkOut;
            existingRecord.checkOutNextDay = summary.checkOutNextDay;
            existingRecord.status = status;
            existingRecord.lateTier = lateTier;
            existingRecord.workHours = summary.workHours;
            existingRecord.shift = shiftName;
            await existingRecord.save();
          }
          stats.updated++;
        } else {
          if (dryRun) {
            diffs.push({
              employee: employee.name, code: employee.code, date: shiftDate,
              before: null,
              after: { checkIn: summary.checkIn, checkOut: summary.checkOut, nextDay: summary.checkOutNextDay, status }
            });
          } else {
            await Attendance.create({
              employee: employee._id,
              date: shiftDate,
              shift: shiftName,
              checkIn: summary.checkIn,
              checkOut: summary.checkOut,
              checkOutNextDay: summary.checkOutNextDay,
              status,
              lateTier,
              workHours: summary.workHours
            });
          }
          stats.created++;
        }
      }
    }

    return {
      created: stats.created,
      updated: stats.updated,
      skipped: stats.skipped,
      unmappedBadges: Array.from(stats.unmappedBadges),
      ...(dryRun ? { diffs } : {}),
      ...(returnKeys ? { touchedKeys: Array.from(touchedKeys) } : {})
    };
  }
}

export default new AttendanceProcessor();
