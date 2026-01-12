import express from "express";
import {
  createRequest,
  getMyRequests,
  withdrawRequest
} from "../controllers/requestController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// POST /api/requests - Create a new request
router.post("/", protect, createRequest);
console.log("✅ POST /api/requests route registered");

// GET /api/requests/my - Get all requests for current user
router.get("/my", protect, getMyRequests);
console.log("✅ GET /api/requests/my route registered");

// PATCH /api/requests/:id/withdraw - Withdraw a request
router.patch("/:id/withdraw", protect, withdrawRequest);
console.log("✅ PATCH /api/requests/:id/withdraw route registered");

export default router;

