import express from "express";
import { startBackup, getBackupStatus, downloadBackupFile } from "../controllers/backupController.js";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(restrictTo("Admin"));

router.post("/start", startBackup);
router.get("/status/:jobId", getBackupStatus);
router.get("/download/:jobId", downloadBackupFile);

export default router;
