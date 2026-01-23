


// import express from "express";
// import {
//   createRequest,
//   getMyRequests,
//   withdrawRequest,
//   getPendingRequestsForAdmin,
//   updateRequestStatus
// } from "../controllers/requestController.js";
// import User from "../models/userModel.js";
// import { protect } from "../middlewares/authMiddleware.js";

// const router = express.Router();

// /* =========================
//    USER REQUEST ROUTES
// ========================= */

// // Create a new request
// // POST /api/requests
// router.post("/", protect, createRequest);

// // Get logged-in user's requests
// // GET /api/requests/my
// router.get("/my", protect, getMyRequests);

// // Withdraw a pending request
// // PATCH /api/requests/:id/withdraw
// router.patch("/:id/withdraw", protect, withdrawRequest);

// /* =========================
//    ADMIN / MANAGEMENT ROUTES
//    (NO adminOnly middleware)
// ========================= */

// // Get all pending requests
// // GET /api/requests/admin/pending
// router.get(
//   "/admin/pending",
//   protect,
//   getPendingRequestsForAdmin
// );


// router.put(
//   "/:requestId/action",
//   protect,           // existing auth
//       // whatever role check you already use
//   updateRequestStatus
// );


// export default router;



import express from "express";
import {
  createRequest,
  getMyRequests,
  withdrawRequest,
  getPendingRequestsForAdmin,
  updateRequestStatus,
  approveDocumentRequest,
  rejectDocumentRequest,
  downloadDocument
} from "../controllers/requestController.js";
import { protect, hasPermission } from "../middlewares/authMiddleware.js";
import upload from "../config/multer.js";

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
========================= */

// Get all pending requests
// GET /api/requests/admin/pending
router.get(
  "/admin/pending",
  protect,
  hasPermission("APPROVE_REQUESTS"),
  getPendingRequestsForAdmin
);

// Update request status (For LEAVE and SALARY requests)
// PUT /api/requests/:requestId/action
router.put(
  "/:requestId/action",
  protect,
  hasPermission("APPROVE_REQUESTS"),
  updateRequestStatus
);

/* =========================
   DOCUMENT REQUEST ROUTES
========================= */

// Approve document request with file upload
// PUT /api/requests/:requestId/approve-document
router.put(
  "/:requestId/approve-document",
  protect,
  hasPermission("APPROVE_REQUESTS"),
  upload.single('document'),
  approveDocumentRequest
);

// Reject document request
// PUT /api/requests/:requestId/reject-document
router.put(
  "/:requestId/reject-document",
  protect,
  hasPermission("APPROVE_REQUESTS"),
  rejectDocumentRequest
);

// Download document
// GET /api/requests/:requestId/download
router.get(
  "/:requestId/download",
  protect,
  downloadDocument
);

export default router;