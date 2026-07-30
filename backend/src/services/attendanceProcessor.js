import Employee from "../models/employeeModel.js";
import Attendance from "../models/attendanceModel.js";
import badgeNumberCache from "./badgeNumberCache.js";
import {
  getShiftRules,
  calculateLateTier,
  calculateDuration,
  getApprovedLeavesMap,
  isLeave
} from "../utils/attendanceUtils.js";

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

    // 1. Group transactions by Employee Code (Badge Number) + Date
    const grouped = {};
    const employeeCodes = new Set();

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
      const key = `${code}_${dateStr}`;

      employeeCodes.add(code);

      if (!grouped[key]) {
        grouped[key] = {
          badgeNumber: code,
          employeeName: txn.rawData?.personName || null, // Capture name from Attendance API
          date: dateStr,
          checkIn: null,
          checkOut: null
        };
      }

      if (txn.transactionType === "IN") {
        // Keep earliest check-in
        if (!grouped[key].checkIn || timeStr < grouped[key].checkIn) {
          grouped[key].checkIn = timeStr;
        }
      } else if (txn.transactionType === "OUT") {
        // Keep latest check-out
        if (!grouped[key].checkOut || timeStr > grouped[key].checkOut) {
          grouped[key].checkOut = timeStr;
        }
      }
    }

    // 2. Fetch employees by `code` — confirmed against real device data that the
    // Attendance API's employeeID equals the employee's HRMS code directly for
    // regular staff (Employee.badgeNumber is unused/unpopulated in practice).
    const employeesList = await Employee.find({ code: { $in: Array.from(employeeCodes) } });
    const leaveMap = await getApprovedLeavesMap(employeesList);

    // 3. Process each grouped record
    for (const key in grouped) {
      const record = grouped[key];
      const employee = employeesList.find(e => e.code && e.code.trim() === record.badgeNumber);

      if (!employee) {
        console.warn(`[AttendanceProcessor] Employee with badge number ${record.badgeNumber} not found.`);
        stats.unmappedBadges.add(record.badgeNumber);
        continue;
      }

      // Sync employee name from BioCloud if available and different
      if (record.employeeName && record.employeeName.trim() !== employee.name.trim()) {
        console.log(`[AttendanceProcessor] Updating employee name: "${employee.name}" → "${record.employeeName}" for badge ${record.badgeNumber} (${employee.code})`);
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
