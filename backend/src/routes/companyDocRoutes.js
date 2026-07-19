import express from "express";
import multer from "multer";
import { getDocs, uploadDoc, deleteDoc, getDocStats } from "../controllers/companyDocController.js";
import { protect, hasPermission } from "../middlewares/authMiddleware.js";

const router = express.Router();
const memoryUpload = multer({ storage: multer.memoryStorage() });

// Public route to view (or protected, your choice)
router.get("/", protect, getDocs);

// Upload: 'file' matches the formData key from frontend
router.post("/", protect, hasPermission("MANAGE_DOCUMENTS"), memoryUpload.single("file"), uploadDoc);

// Stats (must be before /:id)
router.get("/stats", protect, getDocStats);

router.delete("/:id", protect, hasPermission("MANAGE_DOCUMENTS"), deleteDoc);

export default router;
