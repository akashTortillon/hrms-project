
import express from "express";
import {
  getDashboardMetrics,
  getCompanyDocumentExpiries,
  getEmployeeVisaExpiries,
  getPendingApprovals,
  getTodaysAttendance
} from "../controllers/dashboardController.js";

const router = express.Router();

router.get("/metrics", getDashboardMetrics);
router.get("/company-documents", getCompanyDocumentExpiries);
router.get("/employee-visas", getEmployeeVisaExpiries);
router.get("/pending-approvals", getPendingApprovals);
router.get("/attendance", getTodaysAttendance);

export default router;
