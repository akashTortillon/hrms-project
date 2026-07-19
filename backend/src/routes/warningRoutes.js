import express from "express";
import multer from "multer";
import { protect } from "../middlewares/authMiddleware.js";
import {
  addWarning,
  getEmployeeWarnings,
  updateWarningStatus,
  deleteWarning
} from "../controllers/warningController.js";

const router = express.Router();
const memoryUpload = multer({ storage: multer.memoryStorage() });

router.use(protect);

// Add warning (HR / Admin / Manager)
router.post("/", memoryUpload.single("attachment"), addWarning);

// Get warnings for an employee
router.get("/:employeeId", getEmployeeWarnings);

// Update warning status
router.patch("/:id/status", updateWarningStatus);

// Delete warning
router.delete("/:id", deleteWarning);

export default router;
