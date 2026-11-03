import Employee from "../models/employeeModel.js";
import Attendance from "../models/attendanceModel.js";
import badgeNumberCache from "./badgeNumberCache.js";
import {
  getShiftRules,
  calculateLateTier,
  calculateDuration,
  getApprovedLeavesMap,
  isLeave,
  toMinutes,
  getUaeTodayDateStr,
  shiftDateStr,
  computeShiftDayBucket,
  checkOutOrderKey
} from "../utils/attendanceUtils.js";

// A shift-day is over once its calendar date is past - except overnight shifts (start >
// end), whose check-out lands on the next calendar day, so yesterday's row stays open
// (same one-day grace as markStaleLoneCheckinsIncomplete).
const isShiftDayOver = (date, rules) => {
  const today = getUaeTodayDateStr();
  if (date >= today) return false;
  const overnight = toMinutes(rules.start) > toMinutes(rules.end);
  return !(overnight && date >= shiftDateStr(today, -1));
};

class AttendanceProcessor {
  /**
   * A lone check-in (no check-out) is stored Present/Late while its day is still running,
   * and processTransactions only re-evaluates a row when new punches for it arrive - so
   * once midnight passes with nobody badging out, the row stayed Present/Late forever
   * (and payroll/attendance never saw an Incomplete). This flips those past-day rows to
   * Incomplete. Idempotent and cheap; run from the scheduled sync tick, the daily sweep
   * and reprocess. Manually edited rows are left alone (HR already decided them).
   * Overnight shifts get one extra day of grace because their check-out lands on the
   * next calendar day.
   * @returns {Promise<number>} number of rows flipped
   */
  async markStaleLoneCheckinsIncomplete() {
    const today = getUaeTodayDateStr();
    const candidates = await Attendance.find({
      date: { $lt: today },
      checkIn: { $nin: [null, ""] },
      $or: [{ checkOut: null }, { checkOut: "" }],
      status: { $in: ["Present", "Late"] },
      isManuallyEdited: { $ne: true }
    }).select("_id date shift");

    if (!candidates.length) return 0;

    const overnightByShift = new Map();
    const isOvernight = async (shiftName) => {
      if (!overnightByShift.has(shiftName)) {
        const rules = await getShiftRules(shiftName);
        overnightByShift.set(shiftName, toMinutes(rules.start) > toMinutes(rules.end));
      }
      return overnightByShift.get(shiftName);
    };

    const yesterday = shiftDateStr(today, -1);
    const ids = [];
    for (const row of candidates) {
      if (row.date >= yesterday && await isOvernight(row.shift || "Day Shift")) continue;
      ids.push(row._id);
    }
    if (!ids.length) return 0;

    const result = await Attendance.updateMany(
      { _id: { $in: ids } },
      { $set: { status: "Incomplete" } }
    );
    return result.modifiedCount || 0;
  }

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

    // 1. Collect badge codes and fetch employees BEFORE grouping - placing a punch on the
    // right shift-day (step 2) needs the employee's shift start/end. Some employees never
    // got badgeNumber backfilled and instead have the device's badge value sitting in `code`
    // (e.g. code: "R106") - fall back to matching on `code` for those.
    const employeeCodes = new Set();
    for (const txn of transactions) {
      if (!txn.badgeNumber || !txn.timestamp) continue;
      employeeCodes.add(txn.badgeNumber.trim());
    }

    const codesArray = Array.from(employeeCodes);
    const employeesList = await Employee.find({
      $or: [
        { badgeNumber: { $in: codesArray } },
        { code: { $in: codesArray } }
      ]
    });
    const leaveMap = await getApprovedLeavesMap(employeesList);

    // First employee in list order wins per badge value, badgeNumber or code alike.
    const employeeByBadge = new Map();
    for (const e of employeesList) {
      for (const v of [e.badgeNumber, e.code]) {
        const k = v && v.trim();
        if (k && !employeeByBadge.has(k)) employeeByBadge.set(k, e);
      }
    }

    const shiftRulesCache = new Map();
    const getRulesCached = async (shiftName) => {
      if (!shiftRulesCache.has(shiftName)) {
        shiftRulesCache.set(shiftName, await getShiftRules(shiftName));
      }
      return shiftRulesCache.get(shiftName);
    };

    // 2. Group transactions by Employee Code (Badge Number) + shift-day
    const grouped = {};

    for (const txn of transactions) {
      if (!txn.badgeNumber || !txn.timestamp) continue;

      // The stored timestamp is a correct UTC instant (biometricSyncService anchors it to
      // UAE +04:00 on ingest). Bucketing/display must use UAE LOCAL date+time, not UTC -
      // otherwise a punch between 00:00-03:59 UAE time (20:00-23:59 UTC the day before)
      // gets grouped onto the wrong calendar day. UAE has no DST, so a fixed +4h shift is
      // enough - no timezone-database lookup needed.
      const uaeTime = new Date(new Date(txn.timestamp).getTime() + 4 * 60 * 60 * 1000);
      const dateStr = uaeTime.toISOString().split("T")[0];
      const timeStr = uaeTime.toISOString().split("T")[1].substring(0, 5); // HH:MM, UAE local
      const code = txn.badgeNumber.trim();

      // A shift that runs past midnight (e.g. 09:00-03:00) has its check-out on the NEXT
      // calendar date; bucketing by raw date would split one shift across two rows. Anchor
      // the punch to the shift-day instead. Unmapped badges keep the raw date (skipped below).
      const employee = employeeByBadge.get(code);
      const rules = employee ? await getRulesCached(employee.shift || "Day Shift") : null;
      const shiftDate = rules ? computeShiftDayBucket(dateStr, timeStr, txn.transactionType, rules) : dateStr;
      const key = `${code}_${shiftDate}`;

      if (!grouped[key]) {
        grouped[key] = {
          badgeNumber: code,
          employeeName: txn.rawData?.EmployeeName || null, // Capture name from BioCloud
          date: shiftDate,
          checkIn: null,
          checkOut: null,
          checkOutNextDay: false
        };
      }

      if (txn.transactionType === "IN") {
        // Keep earliest check-in
        if (!grouped[key].checkIn || timeStr < grouped[key].checkIn) {
          grouped[key].checkIn = timeStr;
        }
      } else if (txn.transactionType === "OUT") {
        // Keep latest check-out - a next-day punch is later than any same-day one
        const nextDay = dateStr !== shiftDate;
        if (!grouped[key].checkOut ||
            checkOutOrderKey(timeStr, nextDay) > checkOutOrderKey(grouped[key].checkOut, grouped[key].checkOutNextDay)) {
          grouped[key].checkOut = timeStr;
          grouped[key].checkOutNextDay = nextDay;
        }
      }
    }

    // 3. Process each grouped record
    for (const key in grouped) {
      const record = grouped[key];
      const employee = employeeByBadge.get(record.badgeNumber);

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
      const rules = await getShiftRules(shiftName);

      // Check if updating is needed
      if (existingRecord) {
        // A sync run only fetches transactions since its last cursor, so an employee's
        // check-in and check-out for the same day routinely land in TWO SEPARATE calls
        // to this function (checked in mid-morning, synced; checked out in the evening,
        // synced later). `record` here only reflects whichever side THIS batch happened
        // to contain. Take the EARLIEST check-in and LATEST check-out seen across both
        // this batch and the already-saved record - not "this batch wins if present" -
        // otherwise a later batch whose checkIn reflects a second/duplicate punch (e.g. a
        // lunch re-entry) silently overwrites the true, earlier check-in with a wrong
        // later one, while checkout stays correct (same bug class that previously flipped
        // present/late to Absent, just the mirror-image failure on the checkIn side).
        const mergedCheckIn = [record.checkIn, existingRecord.checkIn]
          .filter(Boolean)
          .sort()[0] ?? null;
        // Latest check-out, next-day aware: "01:18" next day beats "22:00" same day.
        const outCandidates = [
          { time: record.checkOut, nextDay: record.checkOutNextDay },
          { time: existingRecord.checkOut, nextDay: !!existingRecord.checkOutNextDay }
        ].filter(c => c.time);
        const latestOut = outCandidates.sort(
          (a, b) => checkOutOrderKey(b.time, b.nextDay) - checkOutOrderKey(a.time, a.nextDay)
        )[0];
        const mergedCheckOut = latestOut?.time ?? null;
        const mergedCheckOutNextDay = latestOut ? latestOut.nextDay : false;

        let mergedStatus = "Absent";
        let mergedLateTier = 0;
        if (mergedCheckIn) {
          mergedLateTier = calculateLateTier(mergedCheckIn, rules);
          mergedStatus = mergedLateTier > 0 ? "Late" : "Present";
          // A checked-in employee with no checkout on a day that's already over never
          // came back to badge out - flag it instead of quietly calling it Present/Late.
          if (!mergedCheckOut && isShiftDayOver(record.date, rules)) {
            mergedStatus = "Incomplete";
          }
        } else if (mergedCheckOut && isShiftDayOver(record.date, rules)) {
          // Mirror image of the above: a checkout with no matching check-in ever
          // recorded (missed/failed IN punch, or a mis-synced OUT-only device event).
          // Previously fell through to the "Absent" default, which is wrong - the
          // employee clearly was here. Flag it the same way as the check-in-only case.
          mergedStatus = "Incomplete";
        }
        const mergedWorkHours = calculateDuration(mergedCheckIn, mergedCheckOut);

        // If times are already identical, skip to prevent unnecessary writes/triggers
        if (
          existingRecord.checkIn === mergedCheckIn &&
          existingRecord.checkOut === mergedCheckOut &&
          !!existingRecord.checkOutNextDay === mergedCheckOutNextDay &&
          existingRecord.status === mergedStatus &&
          existingRecord.lateTier === mergedLateTier &&
          existingRecord.workHours === mergedWorkHours
        ) {
          stats.skipped++;
          continue;
        }

        // If manually edited, preserve manual edit details
        if (existingRecord.isManuallyEdited) {
          console.log(`[AttendanceProcessor SKIP] ${record.badgeNumber} on ${record.date} was manually edited. Skipping.`);
          stats.skipped++;
          continue;
        }

        // Update existing record
        existingRecord.checkIn = mergedCheckIn;
        existingRecord.checkOut = mergedCheckOut;
        existingRecord.checkOutNextDay = mergedCheckOutNextDay;
        existingRecord.status = mergedStatus;
        existingRecord.lateTier = mergedLateTier;
        existingRecord.workHours = mergedWorkHours;
        existingRecord.shift = shiftName;
        await existingRecord.save();
        stats.updated++;
      } else {
        // First transaction seen for this employee+date - no existing record to merge
        // against, so record.checkIn/checkOut (whichever this batch has) is authoritative.
        let status = "Absent";
        let lateTier = 0;
        if (record.checkIn) {
          lateTier = calculateLateTier(record.checkIn, rules);
          status = lateTier > 0 ? "Late" : "Present";
          if (!record.checkOut && isShiftDayOver(record.date, rules)) {
            status = "Incomplete";
          }
        } else if (record.checkOut && isShiftDayOver(record.date, rules)) {
          // Checkout with no check-in ever recorded - same "clearly not Absent" case
          // as the merge-branch above, just for the first transaction seen for this
          // employee+date (no existing record to merge against yet).
          status = "Incomplete";
        }
        const workHours = calculateDuration(record.checkIn, record.checkOut);

        // Create new record
        await Attendance.create({
          employee: employee._id,
          date: record.date,
          shift: shiftName,
          checkIn: record.checkIn,
          checkOut: record.checkOut,
          checkOutNextDay: record.checkOutNextDay,
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
}

export default new AttendanceProcessor();