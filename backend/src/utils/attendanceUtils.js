import Master from "../models/masterModel.js";
import Employee from "../models/employeeModel.js";
import Request from "../models/requestModel.js";
import User from "../models/userModel.js";
import SystemSettings from "../models/systemSettingsModel.js";

// Helper: Parse time to minutes (HH:MM) -> minutes
export const toMinutes = (time) => {
  if (!time) return 0;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

// Helper: Calculate duration between two times in HH:MM format
export const calculateDuration = (start, end) => {
  if (!start || !end) return null;
  const startMin = toMinutes(start);
  const endMin = toMinutes(end);
  let duration = endMin - startMin;
  if (duration < 0) duration += 24 * 60; // Handle overnight

  const h = Math.floor(duration / 60);
  const m = duration % 60;
  return `${h}h ${m}m`;
};

/**
 * Get Shift Rules from Master
 */
export const getShiftRules = async (shiftName) => {
  const shiftMaster = await Master.findOne({ type: "SHIFT", name: shiftName });
  if (shiftMaster && shiftMaster.metadata) {
    const meta = shiftMaster.metadata;
    // Extract buffers from latePolicy if available, otherwise fallback to buffers or lateLimit
    let buffers = [];
    if (meta.latePolicy && Array.isArray(meta.latePolicy)) {
      buffers = meta.latePolicy.map(p => p.time).filter(t => t);
    } else {
      buffers = meta.buffers || [meta.lateLimit || "09:15"];
    }

    return {
      start: meta.startTime || "09:00",
      end: meta.endTime || "18:00",
      lateLimit: meta.lateLimit || "09:15",
      latePolicy: meta.latePolicy || [],
      buffers: buffers.length > 0 ? buffers : ["09:15"]
    };
  }
  // Default fallback
  return { start: "09:00", end: "18:00", lateLimit: "09:15", buffers: ["09:15"], latePolicy: [] };
};

export const calculateLateTier = (checkInTime, rules) => {
  if (!checkInTime) return 0;
  const checkInMin = toMinutes(checkInTime);

  // Ensure we have at least one buffer
  const buffers = rules.buffers || [rules.lateLimit];
  if (buffers.length === 0) return 0;

  // Convert all buffers to minutes
  const bufferMins = buffers.map(b => toMinutes(b)).sort((a, b) => a - b);

  if (checkInMin <= bufferMins[0]) return 0; // On Time

  if (bufferMins.length === 1) return 1; // Only 1 buffer defined, so simple Late

  if (checkInMin <= bufferMins[1]) return 1; // Between Buf1 and Buf2
  if (bufferMins.length === 2) return 2; // > Buf2, limit reached

  if (checkInMin <= bufferMins[2]) return 2; // Between Buf2 and Buf3

  return 3; // > Buf3
};

// Builds a Set of "YYYY-MM-DD" strings from a SystemSettings.holidays array. Pulled out
// as a pure function (no DB call) so payrollController can reuse it against a
// `settings` object it already fetched, instead of re-deriving this Set with its own
// copy of the date-matching logic.
//
// Uses getUTC* getters, not local-timezone getters. holidays[].date is a bare
// "YYYY-MM-DD" from a <input type="date">, which the JS Date parser reads as UTC
// midnight - reading it back with local getters is only correct if the server
// process's OS timezone happens to be UTC-or-later-same-day, and silently mislabels
// the holiday by one day otherwise. This is NOT the same situation as real biometric
// punch timestamps elsewhere in this codebase (see biometricSyncService.js's
// parseBioCloudTimestamp / this file's own UAE +4h anchor for those) - those are true
// moments-in-time that need a +4h shift to land on the correct UAE calendar day. A
// holiday date is already normalized to UTC midnight with no "real" time-of-day
// component, so a plain UTC read is both correct and simpler - do not add a +4h shift
// here, that would incorrectly push it a day in the other direction.
export const holidaySetFromHolidays = (holidays = []) => {
  const holidaySet = new Set();
  holidays.forEach(h => {
    if (h.date) {
      const d = new Date(h.date);
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(d.getUTCDate()).padStart(2, '0');
      holidaySet.add(`${yyyy}-${mm}-${dd}`);
    }
  });
  return holidaySet;
};

// Helper: Get Holidays Set
export const getHolidaysSet = async () => {
  const settings = await SystemSettings.findOne();
  return holidaySetFromHolidays(settings?.holidays || []);
};

// True if `dateObj` falls on one of the given employee's recurring weekly off-days,
// under their Working Day Type (see employeeModel.js for the 0/2/4/8 meanings).
// `systemDefault` is the company-wide fallback shape { workingDayType, weekOffDays }
// (typically SystemSettings' defaultWorkingDayType/defaultWeekOffDays), used only when
// the employee has no explicit value of their own.
//
// Type 0 (no days off) and type 2 (flexible monthly allowance, not tied to any
// weekday) both always return false here - neither is a "this specific calendar day
// is structurally off" fact. Type 2's allowance is handled separately, after the
// per-day loop, by applyMonthlyFlexQuota() below - it can't be decided per-day in
// isolation since it's a monthly budget, not a fixed pattern.
export const isWeekOff = (dateObj, employee, systemDefault = {}) => {
  const type = employee?.workingDayType ?? systemDefault?.workingDayType ?? 4;
  if (type === 0 || type === 2) return false;

  const days = (employee?.weekOffDays && employee.weekOffDays.length)
    ? employee.weekOffDays
    : ((systemDefault?.weekOffDays && systemDefault.weekOffDays.length) ? systemDefault.weekOffDays : [0]);
  return days.includes(dateObj.getDay());
};

// For workingDayType===2 (flexible monthly allowance): walks a period's day-by-day
// status array in date order and converts up to `quotaDays` of the FIRST plain
// "ABSENT" days (no attendance record, not on leave, not a holiday - i.e. genuinely
// unaccounted-for days) into "FLEX_OFF" - a paid status, excluded from the
// deduction basis, same treatment as WEEKEND/HOLIDAY. This is deliberately
// first-come-first-served: the employee doesn't need to file a leave request for
// these, the system just doesn't penalize their first N no-shows each period.
// `dayStatuses` entries are mutated in place; callers should already have them
// sorted chronologically (both attendanceController.js and payrollController.js
// build them in date order).
// `absentStatus`/`flexStatus` are configurable because payrollController.js and
// attendanceController.js use two different status-string casing conventions
// (upper-case 'ABSENT'/'FLEX_OFF' vs display Title-Case "Absent"/"Flex Off") - this
// helper stays agnostic to which one a given caller uses.
export const applyMonthlyFlexQuota = (dayStatuses, quotaDays, { absentStatus = "ABSENT", flexStatus = "FLEX_OFF" } = {}) => {
  if (!quotaDays || quotaDays <= 0) return dayStatuses;
  let remaining = quotaDays;
  for (const day of dayStatuses) {
    if (remaining <= 0) break;
    if (day.status === absentStatus) {
      day.status = flexStatus;
      remaining -= 1;
    }
  }
  return dayStatuses;
};

// Get Map of Approved Leaves for Multiple Employees
export const getApprovedLeavesMap = async (employees) => {
  const emailToEmpId = {};
  const emails = [];
  employees.forEach(emp => {
    if (emp.email) {
      emailToEmpId[emp.email] = emp._id.toString();
      emails.push(emp.email);
    }
  });

  const users = await User.find({ email: { $in: emails } });
  const userIdToEmpId = {};
  const userIds = [];
  users.forEach(u => {
    userIdToEmpId[u._id.toString()] = emailToEmpId[u.email];
    userIds.push(u._id);
  });

  const requests = await Request.find({
    userId: { $in: userIds },
    requestType: "LEAVE",
    status: "APPROVED"
  });

  const map = {}; // empId -> [{start, end}]
  requests.forEach(req => {
    const details = req.details || {};
    const startDate = details.startDate || details.fromDate;
    const endDate = details.endDate || details.toDate;

    if (startDate && endDate) {
      const empId = userIdToEmpId[req.userId.toString()];
      if (empId) {
        if (!map[empId]) map[empId] = [];
        const s = new Date(startDate);
        const e = new Date(endDate);
        s.setHours(0, 0, 0, 0);
        e.setHours(23, 59, 59, 999);
        map[empId].push({
          start: s,
          end: e,
          leaveType: details.leaveType || details.leaveTypeId || "Unpaid Leave"
        });
      }
    }
  });
  return map;
};

// Get Set of EmployeeIDs who are on APPROVED LEAVE for a specific date
export const getApprovedLeaves = async (date, employees) => {
  const onLeaveEmployeeIds = new Set();

  // 1. Map Employee Emails -> Employee IDs
  const emailToEmpId = {};
  const emails = [];
  employees.forEach(emp => {
    if (emp.email) {
      emailToEmpId[emp.email] = emp._id.toString();
      emails.push(emp.email);
    }
  });

  // 2. Find Users for these employees
  const users = await User.find({ email: { $in: emails } });
  const userIdToEmpId = {};
  const userIds = [];

  users.forEach(u => {
    userIdToEmpId[u._id.toString()] = emailToEmpId[u.email];
    userIds.push(u._id);
  });

  // 3. Find APPROVED LEAVE Requests for these users
  const requests = await Request.find({
    userId: { $in: userIds },
    requestType: "LEAVE",
    status: "APPROVED"
  });

  // 4. Check date overlap
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  requests.forEach(req => {
    if (req.details && req.details.startDate && req.details.endDate) {
      const start = new Date(req.details.startDate);
      const end = new Date(req.details.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      if (targetDate >= start && targetDate <= end) {
        const empId = userIdToEmpId[req.userId.toString()];
        if (empId) onLeaveEmployeeIds.add(empId);
      }
    }
  });

  return onLeaveEmployeeIds;
};

// Check if a date is within any leave range
export const isLeave = (empId, dateStr, map) => {
  const ranges = map[empId.toString()];
  if (!ranges) return false;
  const d = new Date(dateStr);
  d.setHours(12, 0, 0, 0); // Mid-day check
  for (const r of ranges) {
    if (d >= r.start && d <= r.end) return true;
  }
  return false;
};
