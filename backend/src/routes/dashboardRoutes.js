import express from "express";
import {
  getDashboardSummary,
  getCompanyDocumentExpiries,
  getEmployeeVisaExpiries,
  getPendingApprovals,
  getTodaysAttendance
} from "../controllers/dashboardController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect); // Secure all dashboard routes

router.get("/summary", getDashboardSummary);
router.get("/company-documents", getCompanyDocumentExpiries);
router.get("/employee-visas", getEmployeeVisaExpiries);
router.get("/pending-approvals", getPendingApprovals);
router.get("/attendance", getTodaysAttendance);

export default router;
