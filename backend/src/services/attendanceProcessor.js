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

      const dateStr = new Date(txn.timestamp).toISOString().split("T")[0];
      const timeStr = new Date(txn.timestamp).toISOString().split("T")[1].substring(0, 5); // HH:MM
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

    // 2. Fetch employees by badgeNumber field for matching
    const employeesList = await Employee.find({ badgeNumber: { $in: Array.from(employeeCodes) } });
    const leaveMap = await getApprovedLeavesMap(employeesList);

    // 3. Process each grouped record
    for (const key in grouped) {
      const record = grouped[key];
      const employee = employeesList.find(e => e.badgeNumber && e.badgeNumber.trim() === record.badgeNumber);

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

      // Determine Status
      let status = "Absent";
      let lateTier = 0;

      if (record.checkIn) {
        lateTier = calculateLateTier(record.checkIn, rules);
        status = lateTier > 0 ? "Late" : "Present";
      }

      // Calculate Work Hours
      const workHours = calculateDuration(record.checkIn, record.checkOut);

      // Check if updating is needed
      if (existingRecord) {
        // If times are already identical, skip to prevent unnecessary writes/triggers
        if (
          existingRecord.checkIn === record.checkIn &&
          existingRecord.checkOut === record.checkOut &&
          existingRecord.status === status &&
          existingRecord.lateTier === lateTier &&
          existingRecord.workHours === workHours
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
        existingRecord.checkIn = record.checkIn;
        existingRecord.checkOut = record.checkOut;
        existingRecord.status = status;
        existingRecord.lateTier = lateTier;
        existingRecord.workHours = workHours;
        existingRecord.shift = shiftName;
        await existingRecord.save();
        stats.updated++;
      } else {
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
