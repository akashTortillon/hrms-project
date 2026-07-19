import express from "express";
import { protect, hasPermission } from "../middlewares/authMiddleware.js";
import {
  getAppraisalCycles,
  createAppraisalCycle,
  getAppraisals,
  createAppraisal,
  approveAppraisal,
  rejectAppraisal
} from "../controllers/appraisalController.js";

const router = express.Router();

router.use(protect);

router.get("/cycles", getAppraisalCycles);
router.post("/cycles", hasPermission("MANAGE_APPRAISALS"), createAppraisalCycle);
router.get("/", getAppraisals);
router.post("/", hasPermission("MANAGE_APPRAISALS"), createAppraisal);
router.post("/:id/approve", hasPermission("MANAGE_APPRAISALS"), approveAppraisal);
router.post("/:id/reject", hasPermission("MANAGE_APPRAISALS"), rejectAppraisal);

export default router;
