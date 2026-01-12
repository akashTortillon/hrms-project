import express from "express";
import {
    getDepartments,
    addDepartment,
    updateDepartment,
    deleteDepartment,
    getBranches,
    addBranch,
    updateBranch,
    deleteBranch,
    getDesignations,
    addDesignation,
    updateDesignation,
    deleteDesignation
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

// Designation Routes
router.get("/designations", getDesignations);
router.post("/designations", addDesignation);
router.put("/designations/:id", updateDesignation);
router.delete("/designations/:id", deleteDesignation);

export default router;
