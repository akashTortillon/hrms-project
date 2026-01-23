
import express from "express";
import {
  getDailyAttendance,
  markAttendance,
  updateAttendance,
  getEmployeeAttendanceStats,
  syncBiometrics,
  getMonthlyAttendance,
  exportAttendance,
  getEmployeeAttendanceHistory
} from "../controllers/attendanceController.js";
import { protect, hasPermission } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/sync", protect, hasPermission("MANAGE_ATTENDANCE"), syncBiometrics);
router.get("/monthly", protect, getMonthlyAttendance); // View own or all? Assuming all/manager view for now or handled in controller.
router.get("/export", protect, hasPermission("MANAGE_ATTENDANCE"), exportAttendance);
router.get("/", protect, hasPermission("MANAGE_ATTENDANCE"), getDailyAttendance); // Viewing daily attendance of everyone
router.get("/stats/:employeeId", protect, getEmployeeAttendanceStats); // View specific stats
router.get("/history/:employeeId", protect, getEmployeeAttendanceHistory);
router.post("/mark", protect, hasPermission("MANAGE_ATTENDANCE"), markAttendance); // Manual mark by Admin/HR
router.put("/:id", protect, hasPermission("MANAGE_ATTENDANCE"), updateAttendance);

export default router;
