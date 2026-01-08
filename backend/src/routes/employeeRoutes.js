import express from "express";
import {
  addEmployee,
  getEmployees,
  updateEmployee
} from "../controllers/employeeController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// GET all employees
router.get("/", protect, getEmployees);
console.log("✅ GET /api/employees route registered");

// ADD new employee
router.post("/", protect, addEmployee);
console.log("✅ POST /api/employees route registered");

router.put("/:id", protect, updateEmployee);


export default router;
