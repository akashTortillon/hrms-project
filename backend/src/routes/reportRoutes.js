// backend/routes/reportRoutes.js
import express from "express";
import {
    getDepartmentAttendanceReport,
    getDailyDepartmentAttendanceReport,
    getDocumentExpiryReport,
    getAssetDepreciationReport,
    getPayrollSummaryReport,
    getBranchWiseEmployeeReport,
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
    logManualActivity,
    getLoanReport,
    getAppraisalReport,
    getAttendanceReport,
    getSalaryPaidReport,
    getSalaryRevisionReport,
    getLeaveBalanceReport,
    getHeadcountReport,
    getAssetAssignmentReport,
    getOvertimeAllowanceReport,
    getEmployeeSalaryReport
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

// Payroll Reports — additionally require MANAGE_PAYROLL (VIEW_REPORTS alone must not expose salary data)
router.get("/payroll-summary", hasPermission("MANAGE_PAYROLL"), getPayrollSummaryReport);
router.get("/employees/branch-wise", getBranchWiseEmployeeReport);

// Loan & Appraisal Reports
router.get("/loans", hasPermission("MANAGE_PAYROLL"), getLoanReport);
router.get("/appraisals", getAppraisalReport);

// New Reports
router.get("/attendance-employee", getAttendanceReport);
router.get("/salary-paid", hasPermission("MANAGE_PAYROLL"), getSalaryPaidReport);
router.get("/salary-revision", hasPermission("MANAGE_PAYROLL"), getSalaryRevisionReport);
router.get("/leave-balance", getLeaveBalanceReport);
router.get("/headcount", getHeadcountReport);
router.get("/asset-assignments", getAssetAssignmentReport);
router.get("/overtime-allowance", getOvertimeAllowanceReport);
router.get("/employee-salary", hasPermission("MANAGE_PAYROLL"), getEmployeeSalaryReport);

// Dashboard Stats
router.get("/stats", getReportStats);
router.post("/log-activity", logManualActivity);

// Custom Reports Builder
router.post("/custom", generateCustomReport);
router.get("/custom-configs", getCustomConfigs);
router.post("/custom-configs", saveCustomConfig);
router.patch("/custom-configs/:id", updateCustomConfig);
router.delete("/custom-configs/:id", deleteCustomConfig);

// Compliance Exports (Mapped from Payroll Controller) — payroll-sensitive
router.get("/compliance/wps-sif", hasPermission("MANAGE_PAYROLL"), generateSIF);
router.get("/compliance/mol-report", hasPermission("MANAGE_PAYROLL"), generateMOLReport);

// Scheduled Reports
router.get("/schedules", getSchedules);
router.post("/schedules", createSchedule);
router.patch("/schedules/:id", updateSchedule);
router.delete("/schedules/:id", deleteSchedule);

export default router;
