import express from "express";
import { getDocs, uploadDoc, deleteDoc, getDocStats, replaceDoc, getDocHistory } from "../controllers/companyDocController.js";
import upload from "../config/multer.js";
import { protect, hasPermission } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Public route to view (or protected, your choice)
router.get("/", protect, getDocs);

// Upload: 'file' matches the formData key from frontend
router.post("/", protect, hasPermission("MANAGE_DOCUMENTS"), upload.single("file"), uploadDoc);

// Stats (must be before /:id)
router.get("/stats", protect, getDocStats);

// Version Control & History
router.put("/:id/replace", protect, hasPermission("MANAGE_DOCUMENTS"), upload.single("file"), replaceDoc);
router.get("/:id/history", protect, hasPermission("MANAGE_DOCUMENTS"), getDocHistory);

router.delete("/:id", protect, hasPermission("MANAGE_DOCUMENTS"), deleteDoc);

export default router;
