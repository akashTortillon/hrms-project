
import express from "express";
import { generatePayroll, getPayrollSummary, addAdjustment, finalizePayroll, exportPayroll, generateSIF, generateMOLReport, getPaymentHistory, removePayrollItem, getPayrollAuditLogs, getMyPayslips } from "../controllers/payrollController.js";
import { protect, hasPermission } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);

// ✅ Employee Self-Service Route (Accessible to all authenticated users)
router.get("/my-payslips", getMyPayslips);

// 🔒 Admin Routes (Require MANAGE_PAYROLL)
router.use(hasPermission("MANAGE_PAYROLL"));

router.post("/generate", generatePayroll);
router.get("/summary", getPayrollSummary);
router.post("/adjust", addAdjustment);
router.post("/remove-item", removePayrollItem);
router.post("/finalize", finalizePayroll);
router.get("/export", exportPayroll);
router.get("/export-sif", generateSIF);
router.get("/export-mol", generateMOLReport);
router.get("/history", getPaymentHistory);
router.get("/audit-logs", getPayrollAuditLogs); // ✅ NEW LINE

export default router;
