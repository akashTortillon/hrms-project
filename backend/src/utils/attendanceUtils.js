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

// Helper: Get Holidays Set
export const getHolidaysSet = async () => {
  const settings = await SystemSettings.findOne();
  const holidaySet = new Set();
  if (settings && settings.holidays) {
    settings.holidays.forEach(h => {
      if (h.date) {
        const d = new Date(h.date);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        holidaySet.add(`${yyyy}-${mm}-${dd}`);
      }
    });
  }
  return holidaySet;
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
