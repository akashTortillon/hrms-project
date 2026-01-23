// backend/routes/reportRoutes.js
import express from "express";
import {
    getDepartmentAttendanceReport,
    getDailyDepartmentAttendanceReport,
    getDocumentExpiryReport,
    getAssetDepreciationReport,
    getPayrollSummaryReport,
    generateCustomReport,
    getSchedules,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    getCustomConfigs,
    saveCustomConfig,
    updateCustomConfig,
    deleteCustomConfig,
    getReportStats,
    logManualActivity
} from "../controllers/reportController.js";
import { protect, hasPermission } from "../middlewares/authMiddleware.js";
import { generateSIF, generateMOLReport } from "../controllers/payrollController.js";

const router = express.Router();

// Apply auth and permission check to ALL report routes
router.use(protect);
router.use(hasPermission("VIEW_REPORTS"));

// Attendance Reports
router.get("/department-attendance", getDepartmentAttendanceReport);
router.get("/department-attendance/daily", getDailyDepartmentAttendanceReport);

// Document & Asset Reports
router.get("/document-expiry", getDocumentExpiryReport);
router.get("/asset-depreciation", getAssetDepreciationReport);

// Payroll Reports
router.get("/payroll-summary", getPayrollSummaryReport);

// Dashboard Stats
router.get("/stats", getReportStats);
router.post("/log-activity", logManualActivity);

// Custom Reports Builder
router.post("/custom", generateCustomReport);
router.get("/custom-configs", getCustomConfigs);
router.post("/custom-configs", saveCustomConfig);
router.patch("/custom-configs/:id", updateCustomConfig);
router.delete("/custom-configs/:id", deleteCustomConfig);

// Compliance Exports (Mapped from Payroll Controller)
router.get("/compliance/wps-sif", generateSIF);
router.get("/compliance/mol-report", generateMOLReport);

// Scheduled Reports
router.get("/schedules", getSchedules);
router.post("/schedules", createSchedule);
router.patch("/schedules/:id", updateSchedule);
router.delete("/schedules/:id", deleteSchedule);

export default router;
