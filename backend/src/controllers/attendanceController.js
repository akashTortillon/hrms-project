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
    const { checkIn, checkOut, status } = req.body;

    let workHours = null;

    if (checkIn && checkOut) {
      const [inH, inM] = checkIn.split(":").map(Number);
      const [outH, outM] = checkOut.split(":").map(Number);

      const totalMinutes =
        outH * 60 + outM - (inH * 60 + inM);

      if (totalMinutes > 0) {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        workHours = `${hours}h ${minutes}m`;
      }
    }

    const updated = await Attendance.findByIdAndUpdate(
      id,
      {
        checkIn: status === "Absent" ? null : checkIn,
        checkOut: status === "Absent" ? null : checkOut,
        status,
        workHours
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Attendance not found" });
    }

    res.json(updated);
  } catch (error) {
    console.error("Update attendance error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
