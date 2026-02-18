import express from "express";
import {
  getDashboardSummary,
  getCompanyDocumentExpiries,
  getEmployeeVisaExpiries,
  getPendingApprovals,
  getTodaysAttendance,
  getMobileDashboardStats
} from "../controllers/dashboardController.js";
import { protect, hasPermission } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect); // Secure all dashboard routes

// Most dashboard widgets require VIEW_ADMIN_DASHBOARD
router.get("/summary", hasPermission("VIEW_ADMIN_DASHBOARD"), getDashboardSummary);
router.get("/company-documents", getCompanyDocumentExpiries); // Filtered by access in future or public company info
router.get("/employee-visas", getEmployeeVisaExpiries); // Filtered in controller
router.get("/pending-approvals", hasPermission("APPROVE_REQUESTS"), getPendingApprovals);
router.get("/attendance", hasPermission("VIEW_ADMIN_DASHBOARD"), getTodaysAttendance);
// Mobile Stats (Public or Permitted?) - Let's assume basic permission or authenticated
router.get("/mobile-stats", getMobileDashboardStats);

export default router;
