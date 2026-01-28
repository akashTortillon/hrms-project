import express from "express";
import { protect, hasPermission } from "../middlewares/authMiddleware.js";
import { globalSearch } from "../controllers/searchController.js";

const router = express.Router();

router.get("/", protect, hasPermission("GLOBAL_SEARCH"), globalSearch);

export default router;
