import Employee from "../models/employeeModel.js";
import Attendance from "../models/attendanceModel.js";
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

    // 2. Group transactions by Employee Code (Badge Number) + shift day
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
          date: shiftDate,
          checkIn: null,
          checkInAt: null,  // actual instant behind checkIn, for cross-midnight comparison
          checkOut: null,
          checkOutAt: null  // actual instant behind checkOut, for cross-midnight comparison
        };
      }

      // An overnight shift-day bucket can hold punches from two different calendar
      // dates (an evening OUT and an early-morning-next-day OUT), so "latest"/"earliest"
      // must compare true chronological instants, not the derived HH:MM strings -
      // "22:00" > "01:00" as strings even though 01:00 the next day is later in reality.
      const txnAt = new Date(txn.timestamp).getTime();
      const g = grouped[key];
      if (txn.transactionType === "IN") {
        if (g.checkInAt === null || txnAt < g.checkInAt) {
          g.checkIn = timeStr;
          g.checkInAt = txnAt;
        }
      } else if (txn.transactionType === "OUT") {
        if (g.checkOutAt === null || txnAt > g.checkOutAt) {
          g.checkOut = timeStr;
          g.checkOutAt = txnAt;
        }
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

      // Check if updating is needed
      if (existingRecord) {
        // A sync run only fetches transactions since its last cursor, so an employee's
        // check-in and check-out for the same day routinely land in TWO SEPARATE calls
        // to this function (checked in mid-morning, synced; checked out in the evening,
        // synced later). `record` here only reflects whichever side THIS batch happened
        // to contain - falling back to the existing saved value for whichever side is
        // null in this batch prevents a checkout-only sync from wiping out an
        // already-recorded check-in (and vice versa), which previously flipped a
        // present/late day to "Absent" the moment the checkout synced.
        const mergedCheckIn = record.checkIn ?? existingRecord.checkIn;
        const mergedCheckOut = record.checkOut ?? existingRecord.checkOut;

        let mergedStatus = "Absent";
        let mergedLateTier = 0;
        if (mergedCheckIn) {
          mergedLateTier = calculateLateTier(mergedCheckIn, rules);
          mergedStatus = mergedLateTier > 0 ? "Late" : "Present";
          // A checked-in employee with no checkout on a day that's already over never
          // came back to badge out - flag it instead of quietly calling it Present/Late.
          if (!mergedCheckOut && record.date < getUaeTodayDateStr()) {
            mergedStatus = "Incomplete";
          }
        } else if (mergedCheckOut && record.date < getUaeTodayDateStr()) {
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
          if (!record.checkOut && record.date < getUaeTodayDateStr()) {
            status = "Incomplete";
          }
        } else if (record.checkOut && record.date < getUaeTodayDateStr()) {
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
