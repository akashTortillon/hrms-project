
import express from "express";
import { generatePayroll, getPayrollSummary, addAdjustment, finalizePayroll } from "../controllers/payrollController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/generate", generatePayroll);
router.get("/summary", getPayrollSummary);
router.post("/adjust", addAdjustment);
router.post("/finalize", finalizePayroll);

export default router;
