import mongoose from "mongoose";

const requestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    requestId: {
      type: String,
      required: true,
      unique: true
    },
    requestType: {
      type: String,
      enum: ["LEAVE", "SALARY", "DOCUMENT"],
      required: true
    },

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "COMPLETED", "WITHDRAWN"],
      default: "PENDING"
    },
    submittedAt: {
      type: Date,
      default: Date.now
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    remarks: {
      type: String,
      default: ""
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    approvedAt: {
      type: Date,
      default: null
    },
    withdrawnBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    withdrawnAt: {
      type: Date,
      default: null
    },
    rejectionReason: {
      type: String,
      default: ""
    },
    // ✅ NEW: Document Request specific fields
    documentType: {
      type: String,
      default: ""
    },
    uploadedDocument: {
      type: String, // File path
      default: ""
    },
    uploadedAt: {
      type: Date,
      default: null
    },
    actionBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    // ✅ NEW: Payroll Deduction Tracking (for Loans/Advances)
    payrollDeductions: [{
      month: String, // MM
      year: String,  // YYYY
      amount: Number, // Amount deducted
      date: { type: Date, default: Date.now }
    }],
    isFullyPaid: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

// Index for efficient queries
requestSchema.index({ userId: 1, submittedAt: -1 });

export default mongoose.model("Request", requestSchema);