
import express from "express";
import { generatePayroll, getPayrollSummary, addAdjustment, finalizePayroll, exportPayroll, generateSIF, generateMOLReport, getPaymentHistory } from "../controllers/payrollController.js";
import { protect, hasPermission } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(hasPermission("MANAGE_PAYROLL"));

router.post("/generate", generatePayroll);
router.get("/summary", getPayrollSummary);
router.post("/adjust", addAdjustment);
router.post("/finalize", finalizePayroll);
router.get("/export", exportPayroll);
router.get("/export-sif", generateSIF);
router.get("/export-mol", generateMOLReport);
router.get("/history", getPaymentHistory);

export default router;
