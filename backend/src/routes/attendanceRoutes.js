
import express from "express";
import {
  getDailyAttendance,
  markAttendance,
  updateAttendance,
  getEmployeeAttendanceStats,
  syncBiometrics,
  getMonthlyAttendance,
  exportAttendance
} from "../controllers/attendanceController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/sync", protect, syncBiometrics);
router.get("/monthly", protect, getMonthlyAttendance);
router.get("/export", protect, exportAttendance);
router.get("/", protect, getDailyAttendance);
router.get("/stats/:employeeId", protect, getEmployeeAttendanceStats);
router.post("/mark", protect, markAttendance);
router.put("/:id", protect, updateAttendance);

export default router;
