import express from "express";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";
import { getEmployeeWorkflow, updateWorkflowItem, initiateWorkflow, addItemToWorkflow } from "../controllers/workflowController.js";
import upload from "../middlewares/uploadMiddleware.js"; // Assessing existing upload middleware

const router = express.Router();

router.use(protect); // All routes require login

// Admin/HR Only for managing workflows
// Using restrictTo('Admin', 'HR Manager') - adjust roles based on your Master Roles
// Or hasPermission('MANAGE_EMPLOYEES')

// Since Middleware structure might vary, logic from Implementation Plan:
// "Strictly Admin/HR Only"

const restrictToAdminHR = restrictTo("Admin", "HR Manager");

// Lazy init or get
router.get("/:employeeId/:type", restrictToAdminHR, getEmployeeWorkflow);

// Update item (upload or status)
// This supports file upload 'file' field
router.put("/:workflowId/:itemId", restrictToAdminHR, upload.single('file'), updateWorkflowItem);

// Add custom item
router.post("/:workflowId/items", restrictToAdminHR, addItemToWorkflow);

export default router;
