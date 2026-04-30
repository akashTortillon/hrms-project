import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { getActivityLogs, getActivityStats, clearOldLogs } from "../controllers/activityLogController.js";

const router = express.Router();

router.use(protect);

router.get("/", getActivityLogs);
router.get("/stats", getActivityStats);
router.delete("/clear", clearOldLogs);

export default router;
