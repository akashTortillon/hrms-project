import mongoose from "mongoose";

const leaveLedgerSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true
  },
  leaveType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Master",
    required: true
  },
  transactionType: {
    type: String,
    enum: [
      "OPENING_BALANCE",
      "ANNUAL_CREDIT",
      "LEAVE_TAKEN",
      "LEAVE_ADJUSTMENT",
      "ADVANCE_LEAVE",
      "REFUND",
      "MANUAL_CORRECTION",
      "MIGRATION_ENTRY",
      "LEAVE_REVOKED"
    ],
    required: true
  },
  days: { type: Number, required: true }, // signed: +credit, -usage
  transactionDate: { type: Date, default: Date.now },
  remarks: { type: String, default: "" },
  request: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Request",
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  }
}, { timestamps: true });

leaveLedgerSchema.index({ employee: 1, leaveType: 1, transactionDate: -1 });

export default mongoose.model("LeaveLedger", leaveLedgerSchema);
