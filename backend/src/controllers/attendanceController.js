// import Attendance from "../models/attendanceModel.js";
// import Employee from "../models/employeeModel.js";

// /**
//  * GET daily attendance
//  * /api/attendance?date=YYYY-MM-DD
//  */
// export const getDailyAttendance = async (req, res) => {
//   try {
//     const { date } = req.query;

//     if (!date) {
//       return res.status(400).json({ message: "Date is required" });
//     }

//     // Get all employees
//     const employees = await Employee.find().sort({ code: 1 });

//     // Get attendance for the date
//     const attendanceRecords = await Attendance.find({ date }).populate(
//       "employee"
//     );

//     // Merge employees + attendance
//     const attendanceMap = {};
//     attendanceRecords.forEach((rec) => {
//       attendanceMap[rec.employee._id] = rec;
//     });

//     const result = employees.map((emp) => {
//       const record = attendanceMap[emp._id];

//       return {
//         _id: record?._id || null,
//         employeeId: emp._id,
//         name: emp.name,
//         code: emp.code,
//         department: emp.department,
//         shift: record?.shift || "Day Shift",
//         checkIn: record?.checkIn || null,
//         checkOut: record?.checkOut || null,
//         workHours: record?.workHours || null,
//         status: record?.status || "Absent"
//       };
//     });


//     res.json(result);
//   } catch (error) {
//     console.error("Get daily attendance error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// /**
//  * CREATE attendance (auto-create if missing)
//  */
// export const markAttendance = async (req, res) => {
//   try {
//     const { employeeId, date, checkIn, checkOut, shift } = req.body;

//     const SHIFT_CONFIG = {
//       "Day Shift": { start: "08:00", end: "17:00", lateAfter: "08:00" },
//       "Night Shift": { start: "20:00", end: "05:00", lateAfter: "20:00" }
//     };

//     const toMinutes = (time) => {
//       const [h, m] = time.split(":").map(Number);
//       return h * 60 + m;
//     };

//     const normalize = (time, shiftStart) => {
//       let mins = toMinutes(time);
//       if (shiftStart >= 720 && mins < shiftStart) mins += 1440;
//       return mins;
//     };

//     let status = "Absent";
//     let workHours = null;

//     if (checkIn) {
//       const rule = SHIFT_CONFIG[shift || "Day Shift"];
//       const checkInMin = toMinutes(checkIn);
//       const lateMin = toMinutes(rule.lateAfter);
//       status = checkInMin <= lateMin ? "Present" : "Late";
//     }

//     if (checkIn && checkOut) {
//       const rule = SHIFT_CONFIG[shift || "Day Shift"];

//       let shiftStart = toMinutes(rule.start);
//       let shiftEnd = toMinutes(rule.end);

//       let inMin = normalize(checkIn, shiftStart);
//       let outMin = normalize(checkOut, shiftStart);

//       if (shiftEnd <= shiftStart) shiftEnd += 1440;

//       const actualStart = Math.max(inMin, shiftStart);
//       const actualEnd = Math.min(outMin, shiftEnd);

//       const minutes = Math.max(actualEnd - actualStart, 0);

//       const h = Math.floor(minutes / 60);
//       const m = minutes % 60;
//       workHours = `${h}h ${m}m`;
//     }

//     const attendance = await Attendance.findOneAndUpdate(
//       { employee: employeeId, date },
//       { 
//         employee: employeeId, 
//         date,
//         shift: shift || "Day Shift",
//         checkIn: checkIn || null,
//         checkOut: checkOut || null,
//         status,
//         workHours
//       },
//       { upsert: true, new: true }
//     );

//     res.status(201).json(attendance);
//   } catch (error) {
//     console.error("Mark attendance error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };



// export const updateAttendance = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { checkIn, checkOut, shift } = req.body;

//     const SHIFT_CONFIG = {
//       "Day Shift": { start: "08:00", end: "17:00", lateAfter: "08:00" },
//       "Night Shift": { start: "20:00", end: "05:00", lateAfter: "20:00" }
//     };

//     const toMinutes = (time) => {
//       const [h, m] = time.split(":").map(Number);
//       return h * 60 + m;
//     };

//     const normalize = (time, shiftStart) => {
//       let mins = toMinutes(time);
//       if (shiftStart >= 720 && mins < shiftStart) mins += 1440;
//       return mins;
//     };

//     let status = "Absent";
//     let workHours = null;

//     if (checkIn) {
//       const rule = SHIFT_CONFIG[shift];
//       const checkInMin = toMinutes(checkIn);
//       const lateMin = toMinutes(rule.lateAfter);
//       status = checkInMin <= lateMin ? "Present" : "Late";
//     }

//     if (checkIn && checkOut) {
//       const rule = SHIFT_CONFIG[shift];

//       let shiftStart = toMinutes(rule.start);
//       let shiftEnd = toMinutes(rule.end);

//       let inMin = normalize(checkIn, shiftStart);
//       let outMin = normalize(checkOut, shiftStart);

//       if (shiftEnd <= shiftStart) shiftEnd += 1440;

//       const actualStart = Math.max(inMin, shiftStart);
//       const actualEnd = Math.min(outMin, shiftEnd);

//       const minutes = Math.max(actualEnd - actualStart, 0);

//       const h = Math.floor(minutes / 60);
//       const m = minutes % 60;
//       workHours = `${h}h ${m}m`;
//     }

//     const updated = await Attendance.findByIdAndUpdate(
//       id,
//       { shift, checkIn, checkOut, status, workHours },
//       { new: true }
//     );

//     res.json(updated);
//   } catch (error) {
//     console.error("Update attendance error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };



import Attendance from "../models/attendanceModel.js";
import Employee from "../models/employeeModel.js";
import Master from "../models/masterModel.js";
import Request from "../models/requestModel.js";
import User from "../models/userModel.js";
import SystemSettings from "../models/systemSettingsModel.js";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as XLSX from "xlsx";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper: Parse time to minutes (HH:MM) -> minutes
const toMinutes = (time) => {
  if (!time) return 0;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

// Helper: Get Holidays Set
const getHolidaysSet = async () => {
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

// Helper: Calculate duration between two times in HH:MM format
const calculateDuration = (start, end) => {
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
const getShiftRules = async (shiftName) => {
  const shiftMaster = await Master.findOne({ type: "SHIFT", name: shiftName });
  if (shiftMaster && shiftMaster.metadata) {
    return {
      start: shiftMaster.metadata.startTime || "09:00",
      end: shiftMaster.metadata.endTime || "18:00",
      lateLimit: shiftMaster.metadata.lateLimit || "09:15",
      buffers: shiftMaster.metadata.buffers || [shiftMaster.metadata.lateLimit || "09:15"] // Fallback to single buffer
    };
  }
  // Default fallback if shift not found
  return { start: "09:00", end: "18:00", lateLimit: "09:15", buffers: ["09:15"] };
};

const calculateLateTier = (checkInTime, rules) => {
  if (!checkInTime) return 0;
  const checkInMin = toMinutes(checkInTime);

  // Ensure we have at least one buffer
  const buffers = rules.buffers || [rules.lateLimit];
  if (buffers.length === 0) return 0;

  // Convert all buffers to minutes
  const bufferMins = buffers.map(b => toMinutes(b)).sort((a, b) => a - b);

  // Logic: 
  // <= Buffer 1 -> Present (Tier 0)
  // > Buffer 1 && <= Buffer 2 -> Late Tier 1
  // > Buffer 2 && <= Buffer 3 -> Late Tier 2
  // > Buffer 3 -> Late Tier 3

  if (checkInMin <= bufferMins[0]) return 0; // On Time

  if (bufferMins.length === 1) return 1; // Only 1 buffer defined, so simple Late

  if (checkInMin <= bufferMins[1]) return 1; // Between Buf1 and Buf2
  if (bufferMins.length === 2) return 2; // > Buf2, limit reached

  if (checkInMin <= bufferMins[2]) return 2; // Between Buf2 and Buf3

  return 3; // > Buf3
};

/**
 * SYNC Biometrics
 * Reads mock data and processes attendance
 */
export const syncBiometrics = async (req, res) => {
  try {
    // console.log("Starting Biometric Sync...");
    const dataPath = path.join(__dirname, "../data/mockBiometricData.json");
    if (!fs.existsSync(dataPath)) {
      return res.status(404).json({ message: "Biometric data file not found" });
    }

    const rawData = fs.readFileSync(dataPath, "utf-8");
    const logs = JSON.parse(rawData);
    // console.log(`Found ${logs.length} biometric logs.`);

    // 1. Group logs by Employee + Date
    const groupedData = {};
    const employeeCodes = new Set(); // To fetch relevant employees later

    for (const log of logs) {
      const date = log.timestamp.split("T")[0];
      const time = log.timestamp.split("T")[1].substring(0, 5); // HH:MM
      const key = `${log.employeeCode}_${date}`;
      employeeCodes.add(log.employeeCode);

      if (!groupedData[key]) {
        groupedData[key] = {
          employeeCode: log.employeeCode,
          date,
          checkIn: null,
          checkOut: null
        };
      }

      if (log.type === "IN") {
        // Keep earliest check-in
        if (!groupedData[key].checkIn || time < groupedData[key].checkIn) {
          groupedData[key].checkIn = time;
        }
      } else if (log.type === "OUT") {
        // Keep latest check-out
        if (!groupedData[key].checkOut || time > groupedData[key].checkOut) {
          groupedData[key].checkOut = time;
        }
      }
    }

    // Fetch relevant employees to check for leaves
    const employeesList = await Employee.find({ code: { $in: Array.from(employeeCodes) } });
    const leaveMap = await getApprovedLeavesMap(employeesList);

    // 2. Process each grouped record
    let syncedCount = 0;
    const errors = [];

    for (const key in groupedData) {
      const record = groupedData[key];
      // console.log(`Processing: ${record.employeeCode} on ${record.date} | In: ${record.checkIn} Out: ${record.checkOut}`);

      const employee = employeesList.find(e => e.code === record.employeeCode);

      if (!employee) {
        errors.push(`Employee not found: ${record.employeeCode}`);
        continue;
      }

      // ✅ CHECK LEAVE FIRST: If employee is on approved leave, ignore biometric entry
      if (isLeave(employee._id, record.date, leaveMap)) {
        // console.log(`[SYNC SKIP] ${record.employeeCode} on ${record.date} has Approved Leave. Skipping biometric overwrite.`);
        continue;
      }

      // Get Shift Rules
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

      // console.log(`[SYNC] ${record.employeeCode} | ${record.date} | ${status} | In: ${record.checkIn} Out: ${record.checkOut}`);

      // ✅ NEW: Protect "On Leave" status from being overwritten
      const existingRecord = await Attendance.findOne({ employee: employee._id, date: record.date });
      if (existingRecord && existingRecord.status === "On Leave") {
        // console.log(`[SYNC SKIP] ${record.employeeCode} on ${record.date} is On Leave. Skipping biometric overwrite.`);
        continue;
      }

      // // ✅ NEW: Protect "On Leave" status from being overwritten
      // const existingRecord = await Attendance.findOne({ employee: employee._id, date: record.date });
      // if (existingRecord && existingRecord.status === "On Leave") {
      //   console.log(`[SYNC SKIP] ${record.employeeCode} on ${record.date} is On Leave. Skipping biometric overwrite.`);
      //   continue;
      // }

      // Upsert Attendance
      await Attendance.findOneAndUpdate(
        { employee: employee._id, date: record.date },
        {
          employee: employee._id,
          date: record.date,
          shift: shiftName,
          checkIn: record.checkIn,
          checkOut: record.checkOut,
          checkOut: record.checkOut,
          status,
          lateTier,
          workHours
        },
        { upsert: true, new: true }
      );
      syncedCount++;
    }

    // console.log(`Sync Completed. Processed: ${syncedCount}, Errors: ${errors.length}`);

    res.json({ message: "Sync successful", synced: syncedCount, errors });
  } catch (error) {
    // console.error("Sync error:", error);
    res.status(500).json({ message: "Server error during sync" });
  }
};

/**
 * GET daily attendance
 * /api/attendance?date=YYYY-MM-DD
 */
// Helper: Get Set of EmployeeIDs who are on APPROVED LEAVE for a specific date
const getApprovedLeaves = async (date, employees) => {
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

// ✅ NEW HELPER: Get Map of Approved Leaves for Multiple Employees
const getApprovedLeavesMap = async (employees) => {
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
        // ✅ Include leaveType for Payroll
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

// ✅ NEW HELPER: Check if a date is within any leave range
const isLeave = (empId, dateStr, map) => {
  const ranges = map[empId.toString()];
  if (!ranges) return false;
  const d = new Date(dateStr);
  d.setHours(12, 0, 0, 0); // Mid-day check
  for (const r of ranges) {
    if (d >= r.start && d <= r.end) return true;
  }
  return false;
};

/**
 * GET daily attendance
 * /api/attendance?date=YYYY-MM-DD
 */
export const getDailyAttendance = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }

    // Get employees (Personalized for Employee role)
    const employeeQuery = { status: "Active" };
    if (req.user.role === "Employee") {
      employeeQuery._id = req.user.employeeId;
    }

    const employees = await Employee.find(employeeQuery).sort({ code: 1 }); // Only Active employees

    // Get attendance for the date
    const attendanceRecords = await Attendance.find({ date }).populate("employee");

    // Get Approved Leaves for this date (Consistent with Monthly View)
    const leaveMap = await getApprovedLeavesMap(employees);

    // Merge
    const attendanceMap = {};
    attendanceRecords.forEach((rec) => {
      if (rec.employee) attendanceMap[rec.employee._id.toString()] = rec;
    });

    // 4️⃣ Merge employees + attendance + leave
    const result = employees.map((emp) => {
      const record = attendanceMap[emp._id.toString()];
      // Check if employee is strictly On Leave in their profile OR has an approved leave request
      const isProfileOnLeave = emp.status === "On Leave";
      const isRequestOnLeave = isLeave(emp._id, date, leaveMap);

      return {
        _id: record?._id || null, // If null, no record yet
        employeeId: emp._id,
        name: emp.name,
        code: emp.code,
        department: emp.department,
        shift: record?.shift || emp.shift || "Day Shift",
        checkIn: record?.checkIn || "-",
        checkOut: record?.checkOut || "-",
        workHours: record?.workHours || "-",
        // If record exists AND it's not Absent (or if record says On Leave), use its status.
        // If record doesn't exist, calculate implied status.
        // If profile says On Leave or Request Approved -> "On Leave"
        // Else "Absent"
        status: record?.status || (isProfileOnLeave || isRequestOnLeave ? "On Leave" : "Absent"),
        avatar: emp.avatar // if available
      };
    });

    res.json(result);
  } catch (error) {
    // console.error("Get daily attendance error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET Monthly Attendance
 * /api/attendance/monthly?month=MM&year=YYYY
 */
export const getMonthlyAttendance = async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ message: "Month and Year are required" });
    }

    const startDate = `${year}-${month.padStart(2, "0")}-01`;
    // Calculate end date properly
    const nextMonth = new Date(parseInt(year), parseInt(month), 1); // Month is 0-indexed in Date constructor? No, wait. 
    // Actually, simple string match is safer for YYYY-MM prefix if we store as String.
    // But let's stick to the stored Date String format YYYY-MM-DD.

    // Construct regex or range query
    const regex = new RegExp(`^${year}-${month.padStart(2, "0")}`);

    // Get employees (Personalized for Employee role)
    const employeeQuery = { status: "Active" };
    if (req.user.role === "Employee") {
      employeeQuery._id = req.user.employeeId;
    }

    const employees = await Employee.find(employeeQuery).sort({ code: 1 });
    const attendanceRecords = await Attendance.find({
      date: { $regex: regex }
    });

    // Get Holidays
    const holidaySet = await getHolidaysSet();
    // ✅ NEW: Get Leave Map
    const leaveMap = await getApprovedLeavesMap(employees);

    // Map attendance by Employee -> Date
    const attendanceMap = {};
    attendanceRecords.forEach(rec => {
      if (!attendanceMap[rec.employee]) attendanceMap[rec.employee] = {};
      attendanceMap[rec.employee][rec.date] = rec;
    });

    const daysInMonth = new Date(year, month, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      return `${year}-${month.padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
    });

    const result = employees.map(emp => {
      const empAttendance = attendanceMap[emp._id] || {};
      const attendanceData = {};

      let present = 0, late = 0, absent = 0, leave = 0;

      days.forEach(day => {
        const record = empAttendance[day];
        const dateObj = new Date(day);
        const isSunday = dateObj.getDay() === 0;
        const isHoliday = holidaySet.has(day);

        let status;

        if (record) {
          status = record.status;
        } else {
          // ✅ Updated Priority Logic
          if (emp.status === "On Leave") {
            status = "On Leave";
          } else if (isLeave(emp._id, day, leaveMap)) { // Check approved leave requests
            status = "On Leave";
          } else if (isSunday) {
            status = "Weekend";
          } else if (isHoliday) {
            status = "Holiday";
          } else {
            status = "Absent";
          }
        }

        attendanceData[day] = {
          status,
          checkIn: record?.checkIn,
          checkOut: record?.checkOut
        };

        if (status === "Present") present++;
        else if (status === "Late") late++;
        else if (status === "On Leave") leave++;
        else if (status === "Absent") absent++;
        // Weekends don't count towards absent
      });

      return {
        _id: emp._id,
        name: emp.name,
        code: emp.code,
        stats: { present, late, absent, leave },
        attendance: attendanceData
      };
    });

    res.json(result);

  } catch (error) {
    // console.error("Get monthly attendance error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * CREATE attendance (mark manually)
 */
export const markAttendance = async (req, res) => {
  try {
    const { employeeId, date, checkIn, checkOut, shift } = req.body;

    // Get Shift Rules
    const rules = await getShiftRules(shift || "Day Shift");

    // Determine Status
    let status = "Absent";
    let lateTier = 0;
    if (checkIn) {
      lateTier = calculateLateTier(checkIn, rules);
      status = lateTier > 0 ? "Late" : "Present";
    }

    // Calculate Work Hours
    const workHours = calculateDuration(checkIn, checkOut);

    const attendance = await Attendance.findOneAndUpdate(
      { employee: employeeId, date },
      {
        employee: employeeId,
        date,
        shift: shift || "Day Shift",
        checkIn: checkIn || null,
        checkOut: checkOut || null,
        checkOut: checkOut || null,
        status,
        lateTier,
        workHours
      },
      { upsert: true, new: true }
    );

    res.status(201).json(attendance);
  } catch (error) {
    // console.error("Mark attendance error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Update single attendance record
 */
export const updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { checkIn, checkOut, shift, status } = req.body;

    const workHours = calculateDuration(checkIn, checkOut);

    const updated = await Attendance.findByIdAndUpdate(
      id,
      { shift, checkIn, checkOut, status, workHours }, // Need to re-calc late tier if checkIn changed but simplifying for now or user manual override
      // Ideally if checkIn changes, we should recalc lateTier unless manually set. 
      // For now, let's assume manual update might set status but maybe not lateTier explicitly from frontend yet?
      // Let's safe update if rules available, but `rules` not fetched here. 
      // TODO: Fetch rules for update to be accurate.
      { new: true }
    );

    res.json(updated);
  } catch (error) {
    // console.error("Update attendance error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET Attendance Stats for an Employee
 */
export const getEmployeeAttendanceStats = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    // Start Date: Join Date or Created At or Today fallback
    const startDate = new Date(employee.joinDate || employee.createdAt || new Date());
    startDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    // Fetch ALL records for the employee
    const records = await Attendance.find({ employee: employeeId });

    const holidaySet = await getHolidaysSet();
    // ✅ NEW: Get Leave Map for this employee
    const leaveMap = await getApprovedLeavesMap([employee]);

    const recordMap = {};
    records.forEach(r => recordMap[r.date] = r);

    let present = 0, absent = 0, leave = 0, late = 0;

    // Iterate from Start Date to Today
    let currentDate = new Date(startDate);

    while (currentDate <= today) {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, "0");
      const day = String(currentDate.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;

      const isSunday = currentDate.getDay() === 0;
      const isHoliday = holidaySet.has(dateStr);
      const record = recordMap[dateStr];

      if (record) {
        if (record.status === "Present") present++;
        else if (record.status === "Late") late++;
        else if (record.status === "On Leave") leave++;
        else if (record.status === "Absent") absent++;
      } else {
        // No record -> Implicit Status
        // Only count implicit absent if typically a working day (not Sunday, not Holiday)
        // ✅ Check for Leave
        if (isLeave(employee._id, dateStr, leaveMap)) {
          leave++;
        } else if (!isSunday && !isHoliday) {
          absent++;
        }
      }

      // Next Day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    res.json({
      present,
      absent,
      leave,
      late,
      total: present + absent + leave + late
    });

  } catch (error) {
    // console.error("Get attendance stats error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


/**
 * GET Employee Attendance History (Single Employee, Monthly)
 */
export const getEmployeeAttendanceHistory = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { month, year } = req.query; // Optional, default to current

    const now = new Date();
    const targetMonth = month ? parseInt(month) : now.getMonth() + 1;
    const targetYear = year ? parseInt(year) : now.getFullYear();

    const regex = new RegExp(`^${targetYear}-${String(targetMonth).padStart(2, "0")}`);

    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    const attendanceRecords = await Attendance.find({
      employee: employeeId,
      date: { $regex: regex }
    });

    const holidaySet = await getHolidaysSet();
    // ✅ NEW: Leave Map
    const leaveMap = await getApprovedLeavesMap([employee]);

    const attendanceMap = {};
    attendanceRecords.forEach(rec => attendanceMap[rec.date] = rec);

    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
    const history = [];

    // Determine cutoff for "Future" (end of today)
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${targetYear}-${String(targetMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dateObj = new Date(dateStr);

      const isSunday = dateObj.getDay() === 0;
      const isHoliday = holidaySet.has(dateStr);
      const record = attendanceMap[dateStr];

      let status = "Absent";

      if (record) {
        status = record.status;
      } else {
        if (dateObj > today) status = "-"; // Future
        else if (employee.status === "On Leave") status = "On Leave";
        else if (isLeave(employee._id, dateStr, leaveMap)) status = "On Leave"; // ✅ Check Approved Leaves
        else if (isSunday) status = "Weekend";
        else if (isHoliday) status = "Holiday";
        else status = "Absent";
      }

      history.push({
        date: dateStr,
        status,
        checkIn: record?.checkIn || "-",
        checkOut: record?.checkOut || "-",
        workHours: record?.workHours || "-"
      });
    }

    res.json(history);
  } catch (error) {
    // console.error("Get History Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * EXPORT Attendance to Excel
 */
export const exportAttendance = async (req, res) => {
  try {
    const { view, date, month, year, department, shift, search } = req.query;

    // 1. Fetch Employees (with Filters)
    let matchStage = { status: "Active" };
    if (department) matchStage.department = department;

    // Note: Filtering by 'shift' in Employee model refers to 'Default Shift'. 
    // Attendance record might have a different shift. 
    // For simplicity, we'll filter by Employee Default Shift first, or post-process.
    // Given the frontend behaviour, let's filter after mapping if possible, or filter by default shift here.
    // The frontend filters by the "Shift" displayed in the table, which comes from the record or default.
    // Let's filter post-fetching to align exactly with frontend behavior.

    // Filter by Search (Name, Code)
    if (search) {
      matchStage.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } }
      ];
    }

    const employees = await Employee.find(matchStage).sort({ code: 1 });
    let finalRows = [];
    let headers = [];
    let cols = [];

    if (view === "month" && month && year) {
      // --- MONTHLY EXPORT ---
      const startDate = `${year}-${month.padStart(2, "0")}-01`;
      const regex = new RegExp(`^${year}-${month.padStart(2, "0")}`);

      const attendanceRecords = await Attendance.find({ date: { $regex: regex } });
      const holidaySet = await getHolidaysSet();
      // ✅ NEW: Leave Map
      const leaveMap = await getApprovedLeavesMap(employees);

      // Attendance Map
      const attendanceMap = {};
      attendanceRecords.forEach(rec => {
        if (!attendanceMap[rec.employee]) attendanceMap[rec.employee] = {};
        attendanceMap[rec.employee][rec.date] = rec;
      });

      const daysInMonth = new Date(year, month, 0).getDate();
      const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

      // Build Matrix
      finalRows = employees.map(emp => {
        const row = {
          "Employee ID": emp.code,
          "Name": emp.name,
          "Department": emp.department,
          "Shift": emp.shift || "Day Shift"
        };

        const empAttendance = attendanceMap[emp._id] || {};
        let present = 0, late = 0, absent = 0, leave = 0;

        days.forEach(d => {
          const dateKey = `${year}-${month.padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const record = empAttendance[dateKey];
          const dateObj = new Date(dateKey);
          const isSunday = dateObj.getDay() === 0;
          const isHoliday = holidaySet.has(dateKey);

          let status = "";
          let cellValue = "";

          if (record) {
            status = record.status;
            cellValue = record.status === "Present" ? "P" :
              record.status === "Late" ? "L" :
                record.status === "Absent" ? "A" :
                  record.status === "On Leave" ? "OL" : record.status;
          } else {
            if (emp.status === "On Leave") { status = "On Leave"; cellValue = "OL"; }
            else if (isLeave(emp._id, dateKey, leaveMap)) { status = "On Leave"; cellValue = "OL"; } // ✅ Checked
            else if (isSunday) { status = "Weekend"; cellValue = "W"; }
            else if (isHoliday) { status = "Holiday"; cellValue = "H"; }
            else { status = "Absent"; cellValue = "A"; }
          }

          row[String(d)] = cellValue;

          // Stats
          if (status === "Present") present++;
          else if (status === "Late") late++;
          else if (status === "On Leave") leave++;
          else if (status === "Absent") absent++;
        });

        row["Present"] = present;
        row["Late"] = late;
        row["Absent"] = absent;
        row["Leave"] = leave;

        // Determine if row matches Shift Filter (if applied)
        // Using Default Shift
        if (shift && (emp.shift || "Day Shift") !== shift) return null;

        return row;
      }).filter(r => r !== null);

      headers = ["Employee ID", "Name", "Department", "Shift", "Present", "Late", "Absent", "Leave", ...days.map(String)];

    } else {
      // --- DAILY EXPORT ---
      // Defaults to today if no date? Controller should require date
      const targetDate = date || new Date().toISOString().split('T')[0];

      const attendanceRecords = await Attendance.find({ date: targetDate }).populate("employee");
      const onLeaveSet = await getApprovedLeaves(targetDate, employees);

      const attendanceMap = {};
      attendanceRecords.forEach((rec) => {
        if (rec.employee) attendanceMap[rec.employee._id.toString()] = rec;
      });

      finalRows = employees.map(emp => {
        const record = attendanceMap[emp._id.toString()];
        const isProfileOnLeave = emp.status === "On Leave";
        const isRequestOnLeave = onLeaveSet.has(emp._id.toString());

        const effectiveStatus = record?.status || (isProfileOnLeave || isRequestOnLeave ? "On Leave" : "Absent");
        const effectiveShift = record?.shift || emp.shift || "Day Shift";

        // Filter Check
        if (shift && effectiveShift !== shift) return null;

        return {
          "Employee ID": emp.code,
          "Name": emp.name,
          "Department": emp.department,
          "Shift": effectiveShift,
          "Check In": record?.checkIn || "-",
          "Check Out": record?.checkOut || "-",
          "Work Hours": record?.workHours || "-",
          "Status": effectiveStatus
        };
      }).filter(r => r !== null);
    }

    // Generate Excel
    const worksheet = XLSX.utils.json_to_sheet(finalRows);

    // Formatting cols
    const colWidths = [
      { wch: 12 }, // ID 
      { wch: 25 }, // Name
      { wch: 20 }, // Dept
      { wch: 15 }, // Shift
      { wch: 10 }, // Stats/CheckIn
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
    ];
    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");

    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

    const cleanupName = (view === "month" && month)
      ? `Attendance_${month}-${year}`
      : `Attendance_${date}`;

    res.setHeader("Content-Disposition", `attachment; filename="${cleanupName}.xlsx"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);

  } catch (error) {
    // console.error("Export Attendance Error:", error);
    res.status(500).json({ message: "Export failed" });
  }
};
