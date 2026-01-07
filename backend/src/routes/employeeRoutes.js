import express from "express";
import {
  addEmployee,
  getEmployees
} from "../controllers/employeeController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// GET all employees
router.get("/",  getEmployees);
console.log("✅ GET /api/employees route registered");

// ADD new employee
router.post("/", addEmployee);
console.log("✅ POST /api/employees route registered");

export default router;
