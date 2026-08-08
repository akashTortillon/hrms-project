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
import biometricSyncService from "../services/biometricSyncService.js";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as XLSX from "xlsx";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import {
  toMinutes,
  calculateDuration,
  getShiftRules,
  calculateLateTier,
  getHolidaysSet,
  getApprovedLeavesMap,
  getApprovedLeaves,
  isLeave
} from "../utils/attendanceUtils.js";

/**
 * SYNC Biometrics
 * Manually trigger biometric data synchronization
 */
export const syncBiometrics = async (req, res) => {
  try {
    const { startDate, endDate } = req.body || {};
    const userId = req.user?._id;

    console.log(`[attendanceController] Manual sync triggered by user ${userId}. Range: ${startDate || "Default"} to ${endDate || "Default"}`);

    const result = await biometricSyncService.executeSyncJob(
      "MANUAL",
      startDate || null,
      endDate || null,
      userId
    );

    return res.status(200).json({
      success: true,
      message: "Sync completed successfully",
      data: result
    });
  } catch (error) {
    console.error("[attendanceController] Manual sync failed:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error during manual biometric synchronization"
    });
  }
};

/**
 * GET daily attendance
 * /api/attendance?date=YYYY-MM-DD
 */
// Leave helpers are imported from attendanceUtils.js

/**
 * GET daily attendance
 * /api/attendance?date=YYYY-MM-DD
 */
export const getDailyAttendance = async (req, res) => {
  try {
    const { date, page = 1, limit = 10, status, search } = req.query;

    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }

    // Get employees (Personalized for users without VIEW_ALL_ATTENDANCE permission)
    const canViewAllAttendance = req.user.role === "Admin" || (req.user.permissions && (req.user.permissions.includes("ALL") || req.user.permissions.includes("VIEW_ALL_ATTENDANCE")));
    let employeeQuery = {};

    if (canViewAllAttendance) {
      employeeQuery.status = "Active";
    } else {
      if (!req.user.employeeId) {
        return res.status(403).json({ message: "Access Denied: No employee profile linked" });
      }

      // A Manager has neither ALL nor VIEW_ALL_ATTENDANCE, so previously fell into the
      // self-only branch below - meaning they could only ever see their OWN attendance,
      // never their direct reports'. Widen their scope to themselves + whoever they're
      // designatedManager for (same [user._id, user.employeeId] scope pattern used
      // elsewhere for manager-routing checks).
      const isManagerRole = req.user.role === "Manager" || req.user.permissions?.includes("APPROVE_MANAGER_REQUESTS");
      if (isManagerRole) {
        employeeQuery.status = "Active";
        const scope = [req.user._id, req.user.employeeId].filter(Boolean);
        const reports = await Employee.find({ designatedManager: { $in: scope } }).select("_id");
        employeeQuery._id = { $in: [req.user.employeeId, ...reports.map((r) => r._id)] };
      } else {
        // Pure self-view: show the employee's own attendance regardless of their
        // current Employee.status ("On Leave", "Onboarding", etc). The status
        // filter's purpose is to keep broad/admin lists to active staff only - it
        // was never meant to gate someone from seeing their own record, but doing
        // so unconditionally meant anyone whose status wasn't exactly "Active"
        // (e.g. a Manager-role employee marked something other than Active) got an
        // empty attendance view with no explanation.
        employeeQuery._id = req.user.employeeId;
      }
    }

    // Fetch ALL relevant employees to calculate global stats correctly
    const employees = await Employee.find(employeeQuery).sort({ code: 1 });

    // Get attendance for the date
    const attendanceRecords = await Attendance.find({ date })
      .populate("employee")
      .populate("editedBy", "name");

    // Get Approved Leaves for this date
    const leaveMap = await getApprovedLeavesMap(employees);

    // Merge
    const attendanceMap = {};
    attendanceRecords.forEach((rec) => {
      if (rec.employee) attendanceMap[rec.employee._id.toString()] = rec;
    });

    // 4️⃣ Process Merge to get Full List with Status
    let fullList = employees.map((emp) => {
      const record = attendanceMap[emp._id.toString()];
      const isProfileOnLeave = emp.status === "On Leave";
      const isRequestOnLeave = isLeave(emp._id, date, leaveMap);

      const calculatedStatus = record?.status || (isProfileOnLeave || isRequestOnLeave ? "On Leave" : "Absent");

      return {
        _id: record?._id || null,
        employeeId: emp._id,
        name: emp.name,
        code: emp.code,
        department: emp.department,
        branch: emp.branch,
        shift: record?.shift || emp.shift || "Day Shift",
        checkIn: record?.checkIn || "-",
        checkOut: record?.checkOut || "-",
        workHours: record?.workHours || "-",
        status: calculatedStatus,
        avatar: emp.avatar,
        isManuallyEdited: record?.isManuallyEdited || false,
        editedBy: record?.editedBy || null,
        editedAt: record?.editedAt || null,
        editReason: record?.editReason || null
      };
    });

    // 5️⃣ Calculate Summary Stats (BEFORE filtering)
    const summary = {
      total: fullList.length,
      Present: 0,
      Absent: 0,
      Late: 0,
      "On Leave": 0
    };

    fullList.forEach(item => {
      if (summary[item.status] !== undefined) {
        summary[item.status]++;
      } else {
        // Fallback for any other status, though essentially it should be one of the above
        summary[item.status] = (summary[item.status] || 0) + 1;
      }
    });

    // 6️⃣ Apply Filters (Search, Status, Department, Shift)
    if (search) {
      const q = search.toLowerCase();
      fullList = fullList.filter(item =>
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.department.toLowerCase().includes(q)
      );
    }

    if (status) {
      fullList = fullList.filter(item => item.status === status);
    }

    const { department, shift, branch } = req.query;
    if (department) {
      fullList = fullList.filter(item => item.department === department);
    }
    if (shift) {
      fullList = fullList.filter(item => item.shift === shift);
    }
    if (branch) {
      fullList = fullList.filter(item => item.branch === branch);
    }

    // 7️⃣ Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedData = fullList.slice(startIndex, endIndex);

    // 8️⃣ Final Response
    res.json({
      summary,
      pagination: {
        current: pageNum,
        limit: limitNum,
        totalRecords: fullList.length,
        totalPages: Math.ceil(fullList.length / limitNum)
      },
      data: paginatedData
    });

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

    // Get employees (Personalized for users without VIEW_ALL_ATTENDANCE permission)
    const canViewAll = req.user.role === "Admin" || req.user.permissions.includes("ALL") || req.user.permissions.includes("VIEW_ALL_ATTENDANCE");
    let employeeQuery = {};

    if (canViewAll) {
      employeeQuery.status = "Active";
    } else {
      if (!req.user.employeeId) {
        // Return graceful empty array instead of 403 to prevent frontend crashing
        return res.status(200).json([]);
      }

      // See getDailyAttendance's identical comments - a Manager was previously stuck
      // in the self-only branch and could never see their reports' monthly attendance;
      // a pure self-view was previously gated by Employee.status, hiding an employee's
      // own attendance whenever their profile status wasn't exactly "Active".
      const isManagerRole = req.user.role === "Manager" || req.user.permissions?.includes("APPROVE_MANAGER_REQUESTS");
      if (isManagerRole) {
        employeeQuery.status = "Active";
        const scope = [req.user._id, req.user.employeeId].filter(Boolean);
        const reports = await Employee.find({ designatedManager: { $in: scope } }).select("_id");
        employeeQuery._id = { $in: [req.user.employeeId, ...reports.map((r) => r._id)] };
      } else {
        employeeQuery._id = req.user.employeeId;
      }
    }

    const employees = await Employee.find(employeeQuery).sort({ code: 1 });
    const attendanceRecords = await Attendance.find({
      date: { $regex: regex }
    }).populate("editedBy", "name"); // ✅ Populate Editor

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
          checkOut: record?.checkOut,
          // ✅ New Fields
          isManuallyEdited: record?.isManuallyEdited,
          editedBy: record?.editedBy,
          editedAt: record?.editedAt,
          editReason: record?.editReason
        };

        if (status === "Present") present++;
        else if (status === "Late") late++;
        else if (status === "On Leave") {
          const duration = record?.leaveDuration || 1;
          leave += duration;
          // Note: The prompt requests half-day only. If someone takes a half-day, what is the other half?
          // For now, if leaveDuration is fractional, the other half isn't accounted for in Stats,
          // but the total `leave` will render correctly on the dashboard visually (e.g. 1.5).
        }
        else if (status === "Absent") absent++;
        // Weekends don't count towards absent
      });

      return {
        _id: emp._id,
        name: emp.name,
        code: emp.code,
        department: emp.department,
        branch: emp.branch,
        shift: emp.shift || "Day Shift",
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
 * BULK mark attendance for a date range (Manager / HR)
 * Body: { employeeId, fromDate, toDate, checkIn, checkOut, shift, status, reason, skipWeekends }
 */
export const markAttendanceBulk = async (req, res) => {
  try {
    const { employeeId, fromDate, toDate, checkIn, checkOut, shift, status, reason, skipWeekends } = req.body;

    if (!employeeId || !fromDate || !toDate) {
      return res.status(400).json({ message: "employeeId, fromDate and toDate are required" });
    }

    const start = new Date(fromDate);
    const end = new Date(toDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    if (end < start) {
      return res.status(400).json({ message: "toDate must be on or after fromDate" });
    }

    const rules = await getShiftRules(shift || "Day Shift");
    const results = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay(); // 0 = Sunday, 6 = Saturday
      if (skipWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) continue;

      const dateStr = d.toISOString().split("T")[0];

      let resolvedStatus = status || "Absent";
      let lateTier = 0;

      if (!status) {
        if (checkIn) {
          lateTier = calculateLateTier(checkIn, rules);
          resolvedStatus = lateTier > 0 ? "Late" : "Present";
        }
      }

      const workHours = calculateDuration(checkIn, checkOut);

      const updateData = {
        employee: employeeId,
        date: dateStr,
        shift: shift || "Day Shift",
        checkIn: checkIn || null,
        checkOut: checkOut || null,
        status: resolvedStatus,
        lateTier,
        workHours
      };

      if (reason && req.user) {
        updateData.isManuallyEdited = true;
        updateData.editedBy = req.user._id;
        updateData.editedAt = new Date();
        updateData.editReason = reason;
      }

      const record = await Attendance.findOneAndUpdate(
        { employee: employeeId, date: dateStr },
        updateData,
        { upsert: true, new: true }
      );

      results.push(record);
    }

    res.status(201).json({
      success: true,
      message: `Attendance marked for ${results.length} day(s)`,
      count: results.length,
      data: results
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * CREATE attendance (mark manually)
 */
export const markAttendance = async (req, res) => {
  try {
    const { employeeId, date, checkIn, checkOut, shift, reason } = req.body;

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

    const updateData = {
      employee: employeeId,
      date,
      shift: shift || "Day Shift",
      checkIn: checkIn || null,
      checkOut: checkOut || null,
      checkOut: checkOut || null,
      status,
      lateTier,
      workHours
    };

    // ✅ Track Manual Creation/Edit if Reason provided
    if (reason && req.user) {
      updateData.isManuallyEdited = true;
      updateData.editedBy = req.user._id;
      updateData.editedAt = new Date();
      updateData.editReason = reason;
    }

    const attendance = await Attendance.findOneAndUpdate(
      { employee: employeeId, date },
      updateData,
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
    const { checkIn, checkOut, shift, status, reason } = req.body;

    // ✅ Enforce Mandatory Reason
    if (!reason || reason.trim() === "") {
      return res.status(400).json({ message: "Reason is required for manual edits." });
    }

    const workHours = calculateDuration(checkIn, checkOut);

    const updated = await Attendance.findByIdAndUpdate(
      id,
      {
        shift,
        checkIn,
        checkOut,
        status,
        workHours,
        // ✅ Track Edit
        isManuallyEdited: true,
        editedBy: req.user._id,
        editedAt: new Date(),
        editReason: reason
      },
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
          else if (status === "On Leave") {
            const duration = record?.leaveDuration || 1;
            leave += duration;
          }
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
