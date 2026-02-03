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
import { protect, hasPermission } from "../middlewares/authMiddleware.js";
import upload from "../config/multer.js";

const router = express.Router();

/* =========================
   IMPORT/EXPORT ROUTES
========================= */
router.post("/import", protect, hasPermission("MANAGE_ASSETS"), (req, res, next) => {
   upload.single("file")(req, res, (err) => {
      if (err) {
         console.error("Multer Error:", err);
         return res.status(400).json({ message: "File Upload Error: " + err.message });
      }
      next();
   });
}, importAssets);
router.get("/export", protect, hasPermission("MANAGE_ASSETS"), exportAssets);

/* =========================
   ASSET CRUD ROUTES
========================= */

// GET all assets - Restricted to users with MANAGE_ASSETS permission
router.get("/", protect, hasPermission("MANAGE_ASSETS"), getAssets);

// CREATE new asset
router.post("/", protect, hasPermission("MANAGE_ASSETS"), createAsset);

// ASSIGNMENT ROUTES (must be before /:id) - Managing assignments requires MANAGE_ASSETS
router.post("/assign", protect, hasPermission("MANAGE_ASSETS"), assignAssetToEmployee);
router.post("/transfer", protect, hasPermission("MANAGE_ASSETS"), transferAsset);
router.post("/return", protect, hasPermission("MANAGE_ASSETS"), returnAssetToStore);

// ALERTS & REPORTS (must be before /:id)
router.get("/alerts/all", protect, hasPermission("MANAGE_ASSETS"), getAssetAlerts);

// EMPLOYEE ASSETS (must be before /:id) - Usually employees can see their own, so maybe no hasPermission here OR check in controller
// For now, shielding with MANAGE_ASSETS if it's the admin view
router.get("/employee/:employeeId", protect, hasPermission("MANAGE_ASSETS"), getEmployeeAssets);

// GET asset history (must be before /:id)
router.get("/:id/history", protect, hasPermission("MANAGE_ASSETS"), getAssetHistory);

// GET current assignment (must be before /:id)
router.get("/:id/assignments/current", protect, hasPermission("MANAGE_ASSETS"), getCurrentAssignment);

// GET asset by ID
router.get("/:id", protect, hasPermission("MANAGE_ASSETS"), getAssetById);

// UPDATE asset
router.put("/:id", protect, hasPermission("MANAGE_ASSETS"), updateAsset);

// DELETE asset
router.delete("/:id", protect, hasPermission("MANAGE_ASSETS"), deleteAsset);

/* =========================
   MAINTENANCE ROUTES
========================= */
router.post("/:id/maintenance", protect, hasPermission("MANAGE_ASSETS"), scheduleMaintenance);
router.put("/:id/maintenance/:maintenanceId", protect, hasPermission("MANAGE_ASSETS"), updateMaintenanceLog);
router.delete("/:id/maintenance/:maintenanceId", protect, hasPermission("MANAGE_ASSETS"), deleteMaintenanceLog);

/* =========================
   AMC ROUTES
========================= */
router.put("/:id/amc", protect, hasPermission("MANAGE_ASSETS"), updateAmcDetails);

/* =========================
   DOCUMENT ROUTES
========================= */
// Uploading asset docs should probably be restricted to managers
router.post("/:id/documents", protect, hasPermission("MANAGE_ASSETS"), upload.single("document"), uploadDocument);
router.delete("/:id/documents/:documentId", protect, hasPermission("MANAGE_ASSETS"), deleteDocument);
router.get("/:id/documents/:documentId/download", protect, downloadDocument); // Viewing might be open

/* =========================
   DISPOSAL ROUTES
========================= */
router.post("/:id/dispose", protect, hasPermission("MANAGE_ASSETS"), disposeAsset);

export default router;
