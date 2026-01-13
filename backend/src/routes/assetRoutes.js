import express from "express";
import {
  createAsset,
  getAssets,
  getAssetById,
  updateAsset,
  deleteAsset
} from "../controllers/assetController.js";
import {
  assignAssetToEmployee,
  transferAsset,
  returnAssetToStore
} from "../controllers/assignmentController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// GET all assets
router.get("/", protect, getAssets);
console.log("✅ GET /api/assets route registered");

// CREATE new asset
router.post("/", protect, createAsset);
console.log("✅ POST /api/assets route registered");

// ASSIGN asset to employee (must be before /:id route)
router.post("/assign", protect, assignAssetToEmployee);
console.log("✅ POST /api/assets/assign route registered");

// TRANSFER asset (must be before /:id route)
router.post("/transfer", protect, transferAsset);
console.log("✅ POST /api/assets/transfer route registered");

// RETURN asset to store (must be before /:id route)
router.post("/return", protect, returnAssetToStore);
console.log("✅ POST /api/assets/return route registered");

// GET asset by ID
router.get("/:id", protect, getAssetById);
console.log("✅ GET /api/assets/:id route registered");

// UPDATE asset
router.put("/:id", protect, updateAsset);
console.log("✅ PUT /api/assets/:id route registered");

// DELETE asset
router.delete("/:id", protect, deleteAsset);
console.log("✅ DELETE /api/assets/:id route registered");

export default router;
