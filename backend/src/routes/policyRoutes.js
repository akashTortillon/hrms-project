import express from "express";
import multer from "multer";
import { protect, hasPermission } from "../middlewares/authMiddleware.js";
import { deletePolicy, getPolicies, uploadPolicy } from "../controllers/policyController.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(protect);

router.get("/", getPolicies);
router.post("/", hasPermission("MANAGE_POLICIES"), upload.single("file"), uploadPolicy);
router.delete("/:id", hasPermission("MANAGE_POLICIES"), deletePolicy);

export default router;
