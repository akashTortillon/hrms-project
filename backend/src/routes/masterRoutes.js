import express from "express";
import {
    getDepartments,
    addDepartment,
    updateDepartment,
    deleteDepartment,
    getBranches,
    addBranch,
    updateBranch,
    deleteBranch
} from "../controllers/masterController.js";

const router = express.Router();

// Department Routes
router.get("/departments", getDepartments);
router.post("/departments", addDepartment);
router.put("/departments/:id", updateDepartment);
router.delete("/departments/:id", deleteDepartment);

// Branch Routes
router.get("/branches", getBranches);
router.post("/branches", addBranch);
router.put("/branches/:id", updateBranch);
router.delete("/branches/:id", deleteBranch);

export default router;
