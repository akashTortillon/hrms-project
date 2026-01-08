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
    const { employeeId, date } = req.body;

    const attendance = await Attendance.findOneAndUpdate(
      { employee: employeeId, date },
      { employee: employeeId, date },
      { upsert: true, new: true }
    );

    res.status(201).json(attendance);
  } catch (error) {
    console.error("Mark attendance error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * UPDATE attendance (modal save)
 */
export const updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { checkIn, checkOut, shift } = req.body;

    let status = "Absent";
    let workHours = null;

    const lateAfter =
      shift === "Night Shift" ? "21:00" : "09:00";

    if (checkIn) {
      status = checkIn <= lateAfter ? "Present" : "Late";
    }

    if (checkIn && checkOut) {
      const [inH, inM] = checkIn.split(":").map(Number);
      const [outH, outM] = checkOut.split(":").map(Number);

      let totalMinutes =
        outH * 60 + outM - (inH * 60 + inM);

      if (totalMinutes < 0) totalMinutes += 1440;

      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      workHours = `${h}h ${m}m`;
    }

    const updated = await Attendance.findByIdAndUpdate(
      id,
      {
        shift,
        checkIn,
        checkOut,
        status,
        workHours
      },
      { new: true }
    );

    res.json(updated);
  } catch (error) {
    console.error("Update attendance error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
