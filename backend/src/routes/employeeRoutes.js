import express from "express";
import {
  addEmployee,
  getEmployees,
  updateEmployee,
  deleteEmployee,
  exportEmployees,
  getEmployeeById
} from "../controllers/employeeController.js";
import { protect, hasPermission } from "../middlewares/authMiddleware.js";

const router = express.Router();

// EXPORT employees (Excel) - Requires MANAGE_EMPLOYEES or similar
router.get("/export", protect, hasPermission("MANAGE_EMPLOYEES"), exportEmployees);

// GET all employees - Allow basic access or restrict? 
// For now, keeping it basic protected, or we can use "VIEW_DASHBOARD" or similar if we want some restriction.
// Usually listing employees is basic for many apps, but let's stick to 'protect' so all logged in users can see list (for now).
// If stricter needed: hasPermission("MANAGE_EMPLOYEES")
router.get("/", protect, getEmployees);

// ADD new employee
router.post("/", protect, hasPermission("MANAGE_EMPLOYEES"), addEmployee);

// GET single employee
router.get("/:id", protect, getEmployeeById);

// UPDATE employee
router.put("/:id", protect, hasPermission("MANAGE_EMPLOYEES"), updateEmployee);

// DELETE employee
router.delete("/:id", protect, hasPermission("MANAGE_EMPLOYEES"), deleteEmployee);


export default router;
