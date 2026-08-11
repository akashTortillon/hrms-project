import Employee from "../models/employeeModel.js";
import Attendance from "../models/attendanceModel.js";
import BiometricTransaction from "../models/biometricTransactionModel.js";
import badgeNumberCache from "./badgeNumberCache.js";
import {
  getShiftRules,
  calculateLateTier,
  calculateDuration,
  getApprovedLeavesMap,
  isLeave,
  computeShiftDayBucket
} from "../utils/attendanceUtils.js";

// UAE local "today" as YYYY-MM-DD, matching the +4h anchor this file already uses to
// bucket transactions onto a calendar day. A lone check-in on TODAY just means the
// employee hasn't left yet (mid-shift, not an error) - it only becomes a genuine
// "missing checkout" data problem once the day itself has passed with no checkout ever
// recorded, so this is compared against `record.date` before ever assigning Incomplete.
const getUaeTodayDateStr = () => {
  const uaeNow = new Date(Date.now() + 4 * 60 * 60 * 1000);
  return uaeNow.toISOString().split("T")[0];
};

class AttendanceProcessor {
  /**
   * Processes an array of raw biometric transactions into Attendance records
   * @param {Array} transactions Array of biometric transactions
   * @returns {Promise<Object>} Object containing counts of created, updated, skipped, and unmapped badges
   */
  async processTransactions(transactions) {
    const stats = {
      created: 0,
      updated: 0,
      skipped: 0,
      unmappedBadges: new Set()
    };

    if (!transactions || transactions.length === 0) {
      return stats;
    }

    // 1. Collect badge codes and fetch employees + shift rules BEFORE bucketing -
    // bucketing an overnight shift (see step 2) needs to know each employee's shift
    // start/end to place a punch into the right shift-day, so employee lookup can't
    // happen after grouping the way it used to when every bucket was just a raw
    // calendar date.
    const employeeCodes = new Set();
    for (const txn of transactions) {
      if (!txn.badgeNumber || !txn.timestamp) continue;
      employeeCodes.add(txn.badgeNumber.trim());
    }

    // Fetch employees by `code` — confirmed against real device data that the
    // Attendance API's employeeID equals the employee's HRMS code directly for
    // regular staff (Employee.badgeNumber is unused/unpopulated in practice).
    const employeesList = await Employee.find({ code: { $in: Array.from(employeeCodes) } });
    const employeeByCode = new Map(employeesList.map(e => [e.code.trim(), e]));
    const leaveMap = await getApprovedLeavesMap(employeesList);

    const shiftRulesCache = new Map();
    const getRulesCached = async (shiftName) => {
      if (!shiftRulesCache.has(shiftName)) {
        shiftRulesCache.set(shiftName, await getShiftRules(shiftName));
      }
      return shiftRulesCache.get(shiftName);
    };

    // 2. Determine which employee+shift-day buckets this batch touches. Only the *set*
    //    of buckets is needed here - actual checkIn/checkOut values are re-derived fresh
    //    from the full raw transaction log in step 3 (see _recomputeShiftDay), not
    //    tracked from this batch alone, so a partial batch can never overwrite an
    //    already-correct value with a worse one (see step 3's comment for why that
    //    used to happen).
    const grouped = {};

    for (const txn of transactions) {
      if (!txn.badgeNumber || !txn.timestamp) continue;

      // Stored timestamp is a correct UTC instant (biometricSyncService anchors it to
      // UAE +04:00 on ingest). Bucketing/display must use UAE LOCAL date+time, not UTC -
      // otherwise a punch between 00:00-03:59 UAE time (20:00-23:59 UTC the day before)
      // gets grouped onto the wrong calendar day. UAE has no DST, so a fixed +4h shift is
      // enough - no timezone-database lookup needed.
      const uaeTime = new Date(new Date(txn.timestamp).getTime() + 4 * 60 * 60 * 1000);
      const dateStr = uaeTime.toISOString().split("T")[0];
      const timeStr = uaeTime.toISOString().split("T")[1].substring(0, 5); // HH:MM, UAE local
      const code = txn.badgeNumber.trim();

      // Overnight shifts (e.g. "Flexible" 05:00->03:00) have their checkout land on the
      // NEXT calendar date - bucketing by raw dateStr splits one shift occurrence's
      // check-in and check-out across two Attendance rows. computeShiftDayBucket anchors
      // the bucket to the shift's own start/end instead of calendar midnight.
      const employee = employeeByCode.get(code);
      const shiftName = employee?.shift || "Day Shift";
      const rules = await getRulesCached(shiftName);
      const shiftDate = computeShiftDayBucket(dateStr, timeStr, txn.transactionType, rules);
      const key = `${code}_${shiftDate}`;

      if (!grouped[key]) {
        grouped[key] = {
          badgeNumber: code,
          employeeName: txn.rawData?.personName || null, // Capture name from Attendance API
          date: shiftDate
        };
      }
    }

    // 3. Process each grouped record
    for (const key in grouped) {
      const record = grouped[key];
      const employee = employeeByCode.get(record.badgeNumber);

      if (!employee) {
        console.warn(`[AttendanceProcessor] Employee with badge number ${record.badgeNumber} not found.`);
        stats.unmappedBadges.add(record.badgeNumber);
        continue;
      }

      // HRMS is the source of truth for employee name - only auto-fill from BioCloud
      // when the HRMS record has no name at all (e.g. a brand-new employee whose
      // profile hasn't been filled in yet). Never overwrite a name HR has already
      // set: this used to fire on every sync whenever the two differed at all,
      // which silently reverted deliberate name edits (including case changes)
      // back to whatever the device has on file the next time that employee badged in.
      if (record.employeeName && !employee.name?.trim()) {
        console.log(`[AttendanceProcessor] Filling blank employee name from BioCloud: "${record.employeeName}" for badge ${record.badgeNumber} (${employee.code})`);
        employee.name = record.employeeName.trim();
        await employee.save();
      }

      // Check if employee has approved leave request for this date
      if (isLeave(employee._id, record.date, leaveMap)) {
        console.log(`[AttendanceProcessor SKIP] ${record.badgeNumber} on ${record.date} is on Approved Leave.`);
        stats.skipped++;
        continue;
      }

      // Check if existing attendance record is "On Leave"
      const existingRecord = await Attendance.findOne({ employee: employee._id, date: record.date });
      if (existingRecord && existingRecord.status === "On Leave") {
        console.log(`[AttendanceProcessor SKIP] ${record.badgeNumber} on ${record.date} status is already On Leave.`);
        stats.skipped++;
        continue;
      }

      // Get shift rules
      const shiftName = employee.shift || "Day Shift";
      const rules = await getRulesCached(shiftName);

      // Re-derive checkIn/checkOut fresh from EVERY raw punch for this employee+shift-day
      // instead of merging this batch's partial view with whatever was saved before. A
      // sync run only fetches transactions since its last cursor, so an employee's
      // earlier punches for the same shift-day are typically NOT in this batch - the old
      // "this batch's value wins if present, else fall back to the saved value" logic
      // trusted PRESENCE, not CHRONOLOGY, so a later isolated punch (e.g. a third IN
      // arriving in its own batch) could silently overwrite an already-correct earlier
      // check-in. BiometricTransaction is the actual source of truth; re-deriving from
      // it every time sidesteps the whole "reconcile partial batches" problem.
      const { checkIn, checkOut } = await this._recomputeShiftDay(record.badgeNumber, record.date, rules);

      let status = "Absent";
      let lateTier = 0;
      if (checkIn) {
        lateTier = calculateLateTier(checkIn, rules);
        status = lateTier > 0 ? "Late" : "Present";
        // A checked-in employee with no checkout on a day that's already over never
        // came back to badge out - flag it instead of quietly calling it Present/Late.
        if (!checkOut && record.date < getUaeTodayDateStr()) {
          status = "Incomplete";
        }
      } else if (checkOut && record.date < getUaeTodayDateStr()) {
        // Checkout with no check-in ever recorded (missed/failed IN punch, or a
        // mis-synced OUT-only device event) - clearly not Absent.
        status = "Incomplete";
      }
      const workHours = calculateDuration(checkIn, checkOut);

      if (existingRecord) {
        // If manually edited, preserve manual edit details
        if (existingRecord.isManuallyEdited) {
          console.log(`[AttendanceProcessor SKIP] ${record.badgeNumber} on ${record.date} was manually edited. Skipping.`);
          stats.skipped++;
          continue;
        }

        // If values are already identical, skip to prevent unnecessary writes/triggers
        if (
          existingRecord.checkIn === checkIn &&
          existingRecord.checkOut === checkOut &&
          existingRecord.status === status &&
          existingRecord.lateTier === lateTier &&
          existingRecord.workHours === workHours
        ) {
          stats.skipped++;
          continue;
        }

        existingRecord.checkIn = checkIn;
        existingRecord.checkOut = checkOut;
        existingRecord.status = status;
        existingRecord.lateTier = lateTier;
        existingRecord.workHours = workHours;
        existingRecord.shift = shiftName;
        await existingRecord.save();
        stats.updated++;
      } else {
        await Attendance.create({
          employee: employee._id,
          date: record.date,
          shift: shiftName,
          checkIn,
          checkOut,
          status,
          lateTier,
          workHours
        });
        stats.created++;
      }
    }

    return {
      created: stats.created,
      updated: stats.updated,
      skipped: stats.skipped,
      unmappedBadges: Array.from(stats.unmappedBadges)
    };
  }

  /**
   * Re-derives checkIn/checkOut for one employee+shift-day directly from every raw
   * BiometricTransaction on file, instead of merging partial sync-batch views (see the
   * comment in processTransactions() for why that was unsafe). The query window is
   * generous - 24h before the shift-day's calendar start through 48h after - so it
   * safely covers an overnight shift's tail into the next calendar date without needing
   * to know in advance which raw punches belong to this bucket; computeShiftDayBucket
   * then filters to exactly the ones that do.
   */
  async _recomputeShiftDay(badgeCode, shiftDate, rules) {
    const dayStart = new Date(`${shiftDate}T00:00:00Z`);
    const from = new Date(dayStart.getTime() - 24 * 60 * 60 * 1000);
    const to = new Date(dayStart.getTime() + 48 * 60 * 60 * 1000);

    const txns = await BiometricTransaction.find({
      badgeNumber: badgeCode,
      timestamp: { $gte: from, $lte: to }
    }).sort({ timestamp: 1 }).lean();

    let checkIn = null;
    let checkOut = null;
    for (const txn of txns) {
      const uaeTime = new Date(new Date(txn.timestamp).getTime() + 4 * 60 * 60 * 1000);
      const dateStr = uaeTime.toISOString().split("T")[0];
      const timeStr = uaeTime.toISOString().split("T")[1].substring(0, 5);
      const bucket = computeShiftDayBucket(dateStr, timeStr, txn.transactionType, rules);
      if (bucket !== shiftDate) continue;

      if (txn.transactionType === "IN") {
        if (!checkIn) checkIn = timeStr; // txns sorted ascending - first IN is earliest
      } else if (txn.transactionType === "OUT") {
        checkOut = timeStr; // every OUT overwrites - last one wins as latest
      }
    }
    return { checkIn, checkOut };
  }
}

export default new AttendanceProcessor();
