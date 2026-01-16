


import express from "express";
import {
  createRequest,
  getMyRequests,
  withdrawRequest,
  getPendingRequestsForAdmin,
  updateRequestStatus
} from "../controllers/requestController.js";
import User from "../models/userModel.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

/* =========================
   USER REQUEST ROUTES
========================= */

// Create a new request
// POST /api/requests
router.post("/", protect, createRequest);

// Get logged-in user's requests
// GET /api/requests/my
router.get("/my", protect, getMyRequests);

// Withdraw a pending request
// PATCH /api/requests/:id/withdraw
router.patch("/:id/withdraw", protect, withdrawRequest);

/* =========================
   ADMIN / MANAGEMENT ROUTES
   (NO adminOnly middleware)
========================= */

// Get all pending requests
// GET /api/requests/admin/pending
router.get(
  "/admin/pending",
  protect,
  getPendingRequestsForAdmin
);


router.put(
  "/:requestId/action",
  protect,           // existing auth
      // whatever role check you already use
  updateRequestStatus
);


export default router;
