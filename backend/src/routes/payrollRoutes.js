
import express from "express";
import { generatePayroll, getPayrollSummary } from "../controllers/payrollController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/generate", generatePayroll);
router.get("/summary", getPayrollSummary);

export default router;
