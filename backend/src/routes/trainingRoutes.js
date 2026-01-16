import express from "express";
import { getEmployeeTrainings, addEmployeeTraining } from "../controllers/trainingController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/:employeeId", protect, getEmployeeTrainings);
router.post("/", protect, addEmployeeTraining);

export default router;
