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
      lateLimit: shiftMaster.metadata.lateLimit || "09:15"
    };
  }
  // Default fallback if shift not found
  return { start: "09:00", end: "18:00", lateLimit: "09:15" };
};

/**
 * SYNC Biometrics
 * Reads mock data and processes attendance
 */
export const syncBiometrics = async (req, res) => {
  try {
    console.log("Starting Biometric Sync...");
    const dataPath = path.join(__dirname, "../data/mockBiometricData.json");
    if (!fs.existsSync(dataPath)) {
      return res.status(404).json({ message: "Biometric data file not found" });
    }

    const rawData = fs.readFileSync(dataPath, "utf-8");
    const logs = JSON.parse(rawData);
    console.log(`Found ${logs.length} biometric logs.`);

    // 1. Group logs by Employee + Date
    const groupedData = {};

    for (const log of logs) {
      const date = log.timestamp.split("T")[0];
      const time = log.timestamp.split("T")[1].substring(0, 5); // HH:MM
      const key = `${log.employeeCode}_${date}`;

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

    // 2. Process each grouped record
    let syncedCount = 0;
    const errors = [];

    for (const key in groupedData) {
      const record = groupedData[key];
      // console.log(`Processing: ${record.employeeCode} on ${record.date} | In: ${record.checkIn} Out: ${record.checkOut}`);

      const employee = await Employee.findOne({ code: record.employeeCode });

      if (!employee) {
        errors.push(`Employee not found: ${record.employeeCode}`);
        continue;
      }

      // Get Shift Rules
      const shiftName = employee.shift || "Day Shift";
      const rules = await getShiftRules(shiftName);

      // Determine Status
      let status = "Absent";
      if (record.checkIn) {
        const checkInMin = toMinutes(record.checkIn);
        const lateLimitMin = toMinutes(rules.lateLimit);
        status = checkInMin <= lateLimitMin ? "Present" : "Late";
      }

      // Calculate Work Hours
      const workHours = calculateDuration(record.checkIn, record.checkOut);

      console.log(`[SYNC] ${record.employeeCode} | ${record.date} | ${status} | In: ${record.checkIn} Out: ${record.checkOut}`);

      // Upsert Attendance
      await Attendance.findOneAndUpdate(
        { employee: employee._id, date: record.date },
        {
          employee: employee._id,
          date: record.date,
          shift: shiftName,
          checkIn: record.checkIn,
          checkOut: record.checkOut,
          status: status,
          workHours: workHours
        },
        { upsert: true, new: true }
      );
      syncedCount++;
    }

    console.log(`Sync Completed. Processed: ${syncedCount}, Errors: ${errors.length}`);

    res.json({ message: "Sync successful", synced: syncedCount, errors });
  } catch (error) {
    console.error("Sync error:", error);
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

    // Get all employees
    const employees = await Employee.find({ status: "Active" }).sort({ code: 1 }); // Only Active employees

    // Get attendance for the date
    const attendanceRecords = await Attendance.find({ date }).populate("employee");

    // Get Approved Leaves for this date
    const onLeaveSet = await getApprovedLeaves(date, employees);

    // Merge
    const attendanceMap = {};
    attendanceRecords.forEach((rec) => {
      if (rec.employee) attendanceMap[rec.employee._id.toString()] = rec;
    });

    const result = employees.map((emp) => {
      const record = attendanceMap[emp._id.toString()];
      // Check if employee is strictly On Leave in their profile OR has an approved leave request
      const isProfileOnLeave = emp.status === "On Leave";
      const isRequestOnLeave = onLeaveSet.has(emp._id.toString());

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
        // If record exists, use its status. 
        // If not, check if profile says "On Leave" OR Leave Request Approved. Otherwise "Absent".
        status: record?.status || (isProfileOnLeave || isRequestOnLeave ? "On Leave" : "Absent"),
        avatar: emp.avatar // if available
      };
    });

    res.json(result);
  } catch (error) {
    console.error("Get daily attendance error:", error);
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

    const employees = await Employee.find({ status: "Active" }).sort({ code: 1 });
    const attendanceRecords = await Attendance.find({
      date: { $regex: regex }
    });

    // Get Holidays
    const holidaySet = await getHolidaysSet();

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
          if (emp.status === "On Leave") {
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
    console.error("Get monthly attendance error:", error);
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
    if (checkIn) {
      const checkInMin = toMinutes(checkIn);
      const lateLimitMin = toMinutes(rules.lateLimit);
      status = checkInMin <= lateLimitMin ? "Present" : "Late";
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
        status,
        workHours
      },
      { upsert: true, new: true }
    );

    res.status(201).json(attendance);
  } catch (error) {
    console.error("Mark attendance error:", error);
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
      { shift, checkIn, checkOut, status, workHours },
      { new: true }
    );

    res.json(updated);
  } catch (error) {
    console.error("Update attendance error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET Attendance Stats for an Employee
 */
export const getEmployeeAttendanceStats = async (req, res) => {
  // Keep existing logic or update if needed
  // ... (This function seemed fine in previous version, mostly aggregates DB)
  try {
    const { employeeId } = req.params;

    const stats = await Attendance.aggregate([
      { $match: { employee: new mongoose.Types.ObjectId(employeeId) } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {
      present: 0,
      absent: 0,
      leave: 0,
      late: 0,
      total: 0
    };

    stats.forEach(s => {
      if (s._id === "Present") result.present = s.count;
      else if (s._id === "Absent") result.absent = s.count;
      else if (s._id === "On Leave") result.leave = s.count;
      else if (s._id === "Late") result.late = s.count;
    });

    result.total = result.present + result.absent + result.leave + result.late;

    res.json(result);
  } catch (error) {
    console.error("Get attendance stats error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
