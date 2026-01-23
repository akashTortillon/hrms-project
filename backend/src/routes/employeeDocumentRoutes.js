import express from "express";
import { addDocument, getEmployeeDocuments, deleteDocument } from "../controllers/employeeDocumentController.js";
import upload from "../config/multer.js";
import { protect, hasPermission } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Get docs for a specific employee - Could refine to allow self-view, but for now open to protected
router.get("/:employeeId", protect, getEmployeeDocuments);

// Upload a doc - HR Only
router.post("/", protect, hasPermission("MANAGE_DOCUMENTS"), upload.single("file"), addDocument);

// Delete a doc - HR Only
router.delete("/:id", protect, hasPermission("MANAGE_DOCUMENTS"), deleteDocument);

export default router;
