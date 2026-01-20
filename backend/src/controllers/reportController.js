// backend/controllers/reportController.js
import * as reportService from "../services/reportService.js";

export const getDepartmentAttendanceReport = async (req, res) => {
  try {
    const month = parseInt(req.query.month);
    const year = parseInt(req.query.year);

    if (!month || !year) {
      return res.status(400).json({ message: "Month and year are required" });
    }

    const data = await reportService.getDepartmentAttendance(month, year);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Departmental Attendance Report Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
