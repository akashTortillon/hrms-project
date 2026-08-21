import express from "express";
import { downloadBackup } from "../controllers/backupController.js";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(restrictTo("Admin"));

router.get("/", downloadBackup);

export default router;
