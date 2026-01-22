import express from "express";
import {
   createAsset,
   getAssets,
   getAssetById,
   updateAsset,
   deleteAsset,
   scheduleMaintenance,
   updateMaintenanceLog,
   deleteMaintenanceLog,
   updateAmcDetails,
   uploadDocument,
   deleteDocument,
   downloadDocument,
   disposeAsset,
   getAssetAlerts,
   getEmployeeAssets,
   exportAssets,
   importAssets
} from "../controllers/assetController.js";
import {
   assignAssetToEmployee,
   transferAsset,
   returnAssetToStore,
   getAssetHistory,
   getCurrentAssignment
} from "../controllers/assignmentController.js";
import { protect } from "../middlewares/authMiddleware.js";
import upload from "../config/multer.js";

const router = express.Router();

/* =========================
   IMPORT/EXPORT ROUTES
========================= */
router.post("/import", protect, importAssets);
router.get("/export", protect, exportAssets);

/* =========================
   ASSET CRUD ROUTES
========================= */

// GET all assets
router.get("/", protect, getAssets);

// CREATE new asset
router.post("/", protect, createAsset);

// ASSIGNMENT ROUTES (must be before /:id)
router.post("/assign", protect, assignAssetToEmployee);
router.post("/transfer", protect, transferAsset);
router.post("/return", protect, returnAssetToStore);

// ALERTS & REPORTS (must be before /:id)
router.get("/alerts/all", protect, getAssetAlerts);

// EMPLOYEE ASSETS (must be before /:id)
router.get("/employee/:employeeId", protect, getEmployeeAssets);

// GET asset history (must be before /:id)
router.get("/:id/history", protect, getAssetHistory);

// GET current assignment (must be before /:id)
router.get("/:id/assignments/current", protect, getCurrentAssignment);

// GET asset by ID
router.get("/:id", protect, getAssetById);

// UPDATE asset
router.put("/:id", protect, updateAsset);

// DELETE asset
router.delete("/:id", protect, deleteAsset);

/* =========================
   MAINTENANCE ROUTES
========================= */
router.post("/:id/maintenance", protect, scheduleMaintenance);
router.put("/:id/maintenance/:maintenanceId", protect, updateMaintenanceLog);
router.delete("/:id/maintenance/:maintenanceId", protect, deleteMaintenanceLog);

/* =========================
   AMC ROUTES
========================= */
router.put("/:id/amc", protect, updateAmcDetails);

/* =========================
   DOCUMENT ROUTES
========================= */
router.post("/:id/documents", protect, upload.single("document"), uploadDocument);
router.delete("/:id/documents/:documentId", protect, deleteDocument);
router.get("/:id/documents/:documentId/download", protect, downloadDocument);

/* =========================
   DISPOSAL ROUTES
========================= */
router.post("/:id/dispose", protect, disposeAsset);

export default router;
