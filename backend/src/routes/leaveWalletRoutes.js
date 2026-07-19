import express from "express";
import multer from "multer";
import {
  getEmployeeWallets,
  getMyWallets,
  getEmployeeLedger,
  createMigrationEntry,
  setAllocationOverride,
  grantAdvanceLeave,
  clearPendingRefund,
  downloadBulkImportTemplate,
  bulkImportBalances
} from "../controllers/leaveWalletController.js";
import { protect, hasPermission } from "../middlewares/authMiddleware.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/* =========================
   EMPLOYEE ROUTES
========================= */

// GET /api/leave-wallet/my-wallet
router.get("/my-wallet", protect, getMyWallets);

/* =========================
   HR / ADMIN ROUTES
========================= */

// GET /api/leave-wallet/employee/:employeeId
router.get("/employee/:employeeId", protect, getEmployeeWallets);

// GET /api/leave-wallet/employee/:employeeId/ledger
router.get("/employee/:employeeId/ledger", protect, getEmployeeLedger);

// POST /api/leave-wallet/migration
router.post("/migration", protect, hasPermission("MANAGE_EMPLOYEES"), createMigrationEntry);

// GET /api/leave-wallet/bulk-import/template
router.get("/bulk-import/template", protect, hasPermission("MANAGE_EMPLOYEES"), downloadBulkImportTemplate);

// POST /api/leave-wallet/bulk-import
router.post("/bulk-import", protect, hasPermission("MANAGE_EMPLOYEES"), upload.single("file"), bulkImportBalances);

// PUT /api/leave-wallet/:employeeId/override
router.put("/:employeeId/override", protect, hasPermission("MANAGE_EMPLOYEES"), setAllocationOverride);

// POST /api/leave-wallet/:employeeId/advance
router.post("/:employeeId/advance", protect, hasPermission("MANAGE_EMPLOYEES"), grantAdvanceLeave);

// PATCH /api/leave-wallet/:employeeId/clear-refund
router.patch("/:employeeId/clear-refund", protect, hasPermission("MANAGE_PAYROLL"), clearPendingRefund);

export default router;
