// backend/routes/reportRoutes.js
import express from "express";
import { getDepartmentAttendanceReport } from "../controllers/reportController.js";

const router = express.Router();

// Departmental Attendance Report
// Example: GET /api/reports/department-attendance?month=1&year=2026
router.get("/department-attendance", getDepartmentAttendanceReport);

export default router;
