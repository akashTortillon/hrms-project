import express from "express";
import { getDocs, uploadDoc, deleteDoc, getDocStats } from "../controllers/companyDocController.js";
import upload from "../config/multer.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Public route to view (or protected, your choice)
router.get("/", protect, getDocs);

// Upload: 'file' matches the formData key from frontend
router.post("/", protect, upload.single("file"), uploadDoc);

// Stats (must be before /:id)
router.get("/stats", protect, getDocStats);

router.delete("/:id", protect, deleteDoc);

export default router;
