import express from "express";
import {
  createAsset,
  getAssets,
  getAssetById,
  updateAsset,
  deleteAsset
} from "../controllers/assetController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// GET all assets
router.get("/", protect, getAssets);
console.log("✅ GET /api/assets route registered");

// GET asset by ID
router.get("/:id", protect, getAssetById);
console.log("✅ GET /api/assets/:id route registered");

// CREATE new asset
router.post("/", protect, createAsset);
console.log("✅ POST /api/assets route registered");

// UPDATE asset
router.put("/:id", protect, updateAsset);
console.log("✅ PUT /api/assets/:id route registered");

// DELETE asset
router.delete("/:id", protect, deleteAsset);
console.log("✅ DELETE /api/assets/:id route registered");

export default router;
