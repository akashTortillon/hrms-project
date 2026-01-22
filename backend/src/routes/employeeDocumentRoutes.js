import express from "express";
import { addDocument, getEmployeeDocuments, deleteDocument } from "../controllers/employeeDocumentController.js";
import upload from "../config/multer.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Get docs for a specific employee
router.get("/:employeeId", protect, getEmployeeDocuments);

// Upload a doc
router.post("/", protect, upload.single("file"), addDocument);

// Delete a doc
router.delete("/:id", protect, deleteDocument);

export default router;
