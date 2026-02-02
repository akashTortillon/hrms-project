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

// Routes
router.get("/:type", (req, res, next) => {
    const sensitiveTypes = ["roles", "payroll-rules", "workflow-templates"];
    if (sensitiveTypes.includes(req.params.type)) {
        return hasPermission("MANAGE_MASTERS")(req, res, next);
    }
    next();
}, getItems);

router.post("/:type", hasPermission("MANAGE_MASTERS"), addItem);
router.put("/:type/:id", hasPermission("MANAGE_MASTERS"), updateItem);
router.delete("/:type/:id", hasPermission("MANAGE_MASTERS"), deleteItem);

export default router;
