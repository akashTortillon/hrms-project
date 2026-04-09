import express from "express";
import multer from "multer";
import {
  addEmployee,
  getEmployees,
  updateEmployee,
  deleteEmployee,
  exportEmployees,
  getEmployeeById,
  importEmployees,
  transferEmployee,
  getProbationReminders,
  confirmProbation,
  resetEmployeePassword
} from "../controllers/employeeController.js";
import { protect, hasPermission } from "../middlewares/authMiddleware.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// EXPORT employees (Excel) - Requires MANAGE_EMPLOYEES or similar
router.get("/export", protect, hasPermission("MANAGE_EMPLOYEES"), exportEmployees);

// IMPORT employees (Excel/CSV)
router.post("/import", protect, hasPermission("MANAGE_EMPLOYEES"), upload.single("file"), importEmployees);

// GET all employees - Restricted to users with VIEW_ALL_EMPLOYEES permission
router.get("/", protect, hasPermission("VIEW_ALL_EMPLOYEES"), getEmployees);
router.get("/probation/reminders", protect, hasPermission("MANAGE_EMPLOYEES"), getProbationReminders);

// ADD new employee
router.post("/", protect, hasPermission("MANAGE_EMPLOYEES"), addEmployee);

// GET single employee
router.get("/:id", protect, getEmployeeById);

// UPDATE employee
router.put("/:id", protect, hasPermission("MANAGE_EMPLOYEES"), updateEmployee);
router.post("/:id/transfer", protect, hasPermission("MANAGE_EMPLOYEES"), transferEmployee);
router.post("/:id/confirm-probation", protect, hasPermission("MANAGE_EMPLOYEES"), confirmProbation);
router.put("/:id/reset-password", protect, hasPermission("MANAGE_EMPLOYEES"), resetEmployeePassword);

// DELETE employee
router.delete("/:id", protect, hasPermission("MANAGE_EMPLOYEES"), deleteEmployee);


export default router;
