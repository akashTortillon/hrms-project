import express from "express";
import {
    getItems,
    addItem,
    updateItem,
    deleteItem
} from "../controllers/unifiedMasterController.js";
const router = express.Router();

router.get("/:type", getItems);
router.post("/:type", addItem);
router.put("/:type/:id", updateItem); // Note: Update usually doesn't change type, just ID
router.delete("/:type/:id", deleteItem);

export default router;
