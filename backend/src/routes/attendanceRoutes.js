
import express from "express";
import {
  getDailyAttendance,
  markAttendance,
  updateAttendance,
  getEmployeeAttendanceStats
} from "../controllers/attendanceController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getDailyAttendance);
router.get("/stats/:employeeId", protect, getEmployeeAttendanceStats);
router.post("/mark", protect, markAttendance);
router.put("/:id", protect, updateAttendance);

export default router;
