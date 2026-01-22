
import express from "express";
import {
  getDashboardSummary ,
  getCompanyDocumentExpiries,
  getEmployeeVisaExpiries,
  getPendingApprovals,
  getTodaysAttendance
} from "../controllers/dashboardController.js";

const router = express.Router();

router.get("/summary", getDashboardSummary);
router.get("/company-documents", getCompanyDocumentExpiries);
router.get("/employee-visas", getEmployeeVisaExpiries);
router.get("/pending-approvals", getPendingApprovals);
router.get("/attendance", getTodaysAttendance);

export default router;
