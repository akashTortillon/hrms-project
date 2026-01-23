import express from "express";
import {
    getItems,
    addItem,
    updateItem,
    deleteItem
} from "../controllers/masterController.js";
import { protect, hasPermission } from "../middlewares/authMiddleware.js";

const router = express.Router();

// All routes here require authentication
router.use(protect);

router.get("/:type", getItems);
router.post("/:type", hasPermission("MANAGE_MASTERS"), addItem);
router.put("/:type/:id", hasPermission("MANAGE_MASTERS"), updateItem); // Note: Update usually doesn't change type, just ID
router.delete("/:type/:id", hasPermission("MANAGE_MASTERS"), deleteItem);

export default router;
