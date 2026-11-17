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
import multer from "multer";

const router = express.Router();
const memoryUpload = multer({ storage: multer.memoryStorage() });

// Asset documents: the UI promises "PDF, JPG, PNG (Max 5MB)" - enforce it here too, with a
// clear JSON error instead of an opaque failure.
const ASSET_DOC_MAX_BYTES = 5 * 1024 * 1024;
const ASSET_DOC_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const assetDocumentUpload = multer({
   storage: multer.memoryStorage(),
   limits: { fileSize: ASSET_DOC_MAX_BYTES },
   fileFilter: (req, file, cb) => {
      if (ASSET_DOC_TYPES.includes(file.mimetype)) return cb(null, true);
      const err = new Error("Only PDF, JPG and PNG files are allowed");
      err.code = "INVALID_FILE_TYPE";
      cb(err);
   }
});
const handleAssetDocumentUpload = (req, res, next) => {
   assetDocumentUpload.single("document")(req, res, (err) => {
      if (!err) return next();
      if (err.code === "LIMIT_FILE_SIZE") {
         return res.status(413).json({ message: "File is too large. Maximum size is 5MB." });
      }
      if (err.code === "INVALID_FILE_TYPE") {
         return res.status(400).json({ message: err.message });
      }
      console.error("Asset document upload error:", err);
      return res.status(400).json({ message: "File upload error: " + err.message });
   });
};

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

// EMPLOYEE ASSETS (must be before /:id) - self, the employee's designated manager
// (view-only), or MANAGE_ASSETS holders can see this; getEmployeeAssets itself
// enforces which of those applies, same protect-only pattern requestRoutes.js uses
// for getEmployeeRequests.
router.get("/employee/:employeeId", protect, getEmployeeAssets);

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
router.post("/:id/documents", protect, hasPermission("MANAGE_ASSETS"), handleAssetDocumentUpload, uploadDocument);
router.delete("/:id/documents/:documentId", protect, hasPermission("MANAGE_ASSETS"), deleteDocument);
router.get("/:id/documents/:documentId/download", protect, downloadDocument); // Viewing might be open

/* =========================
   DISPOSAL ROUTES
========================= */
router.post("/:id/dispose", protect, hasPermission("MANAGE_ASSETS"), disposeAsset);

export default router;
