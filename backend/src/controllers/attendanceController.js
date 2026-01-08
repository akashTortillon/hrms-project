import Attendance from "../models/attendanceModel.js";
import Employee from "../models/employeeModel.js";

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
    const employees = await Employee.find().sort({ code: 1 });

    // Get attendance for the date
    const attendanceRecords = await Attendance.find({ date }).populate(
      "employee"
    );

    // Merge employees + attendance
    const attendanceMap = {};
    attendanceRecords.forEach((rec) => {
      attendanceMap[rec.employee._id] = rec;
    });

    const result = employees.map((emp) => {
      const record = attendanceMap[emp._id];

      return {
        _id: record?._id || null,
        employeeId: emp._id,
        name: emp.name,
        code: emp.code,
        department: emp.department,
        shift: record?.shift || "Day Shift",
        checkIn: record?.checkIn || null,
        checkOut: record?.checkOut || null,
        workHours: record?.workHours || null,
        status: record?.status || "Present"
      };
    });

    res.json(result);
  } catch (error) {
    console.error("Get daily attendance error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * CREATE attendance (auto-create if missing)
 */
export const markAttendance = async (req, res) => {
  try {
    const { employeeId, date, checkIn, checkOut, shift } = req.body;

    const SHIFT_CONFIG = {
      "Day Shift": { start: "08:00", end: "17:00", lateAfter: "08:00" },
      "Night Shift": { start: "20:00", end: "05:00", lateAfter: "20:00" }
    };

    const toMinutes = (time) => {
      const [h, m] = time.split(":").map(Number);
      return h * 60 + m;
    };

    const normalize = (time, shiftStart) => {
      let mins = toMinutes(time);
      if (shiftStart >= 720 && mins < shiftStart) mins += 1440;
      return mins;
    };

    let status = "Absent";
    let workHours = null;

    if (checkIn) {
      const rule = SHIFT_CONFIG[shift || "Day Shift"];
      const checkInMin = toMinutes(checkIn);
      const lateMin = toMinutes(rule.lateAfter);
      status = checkInMin <= lateMin ? "Present" : "Late";
    }

    if (checkIn && checkOut) {
      const rule = SHIFT_CONFIG[shift || "Day Shift"];

      let shiftStart = toMinutes(rule.start);
      let shiftEnd = toMinutes(rule.end);

      let inMin = normalize(checkIn, shiftStart);
      let outMin = normalize(checkOut, shiftStart);

      if (shiftEnd <= shiftStart) shiftEnd += 1440;

      const actualStart = Math.max(inMin, shiftStart);
      const actualEnd = Math.min(outMin, shiftEnd);

      const minutes = Math.max(actualEnd - actualStart, 0);

      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      workHours = `${h}h ${m}m`;
    }

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



export const updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { checkIn, checkOut, shift } = req.body;

    const SHIFT_CONFIG = {
      "Day Shift": { start: "08:00", end: "17:00", lateAfter: "08:00" },
      "Night Shift": { start: "20:00", end: "05:00", lateAfter: "20:00" }
    };

    const toMinutes = (time) => {
      const [h, m] = time.split(":").map(Number);
      return h * 60 + m;
    };

    const normalize = (time, shiftStart) => {
      let mins = toMinutes(time);
      if (shiftStart >= 720 && mins < shiftStart) mins += 1440;
      return mins;
    };

    let status = "Absent";
    let workHours = null;

    if (checkIn) {
      const rule = SHIFT_CONFIG[shift];
      const checkInMin = toMinutes(checkIn);
      const lateMin = toMinutes(rule.lateAfter);
      status = checkInMin <= lateMin ? "Present" : "Late";
    }

    if (checkIn && checkOut) {
      const rule = SHIFT_CONFIG[shift];

      let shiftStart = toMinutes(rule.start);
      let shiftEnd = toMinutes(rule.end);

      let inMin = normalize(checkIn, shiftStart);
      let outMin = normalize(checkOut, shiftStart);

      if (shiftEnd <= shiftStart) shiftEnd += 1440;

      const actualStart = Math.max(inMin, shiftStart);
      const actualEnd = Math.min(outMin, shiftEnd);

      const minutes = Math.max(actualEnd - actualStart, 0);

      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      workHours = `${h}h ${m}m`;
    }

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
