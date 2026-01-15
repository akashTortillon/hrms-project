import express from "express";
import {
  addEmployee,
  getEmployees,
  updateEmployee,
  deleteEmployee,
  exportEmployees
} from "../controllers/employeeController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// EXPORT employees (Excel)
router.get("/export", protect, exportEmployees);

// GET all employees
router.get("/", protect, getEmployees);
console.log("✅ GET /api/employees route registered");

// ADD new employee
router.post("/", protect, addEmployee);
console.log("✅ POST /api/employees route registered");

router.put("/:id", protect, updateEmployee);

// DELETE employee
router.delete("/:id", protect, deleteEmployee);


export default router;
