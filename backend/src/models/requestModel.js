import mongoose from "mongoose";

const approvalStageSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ["PENDING", "APPROVED", "REJECTED", "SKIPPED"],
    default: "PENDING"
  },
  actedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  actedAt: {
    type: Date,
    default: null
  },
  remarks: {
    type: String,
    default: ""
  }
}, { _id: false });

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
    currentApprovalStage: {
      type: String,
      enum: ["MANAGER", "HR", "COMPLETED"],
      default: "HR"
    },
    managerApproval: {
      type: approvalStageSchema,
      default: () => ({ status: "PENDING" })
    },
    hrApproval: {
      type: approvalStageSchema,
      default: () => ({ status: "PENDING" })
    },
    designatedManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    status: {
      type: String,
      enum: ["PENDING", "MANAGER_APPROVED", "APPROVED", "REJECTED", "COMPLETED", "WITHDRAWN"],
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
      type: String,
      default: ""
    },
    uploadedDocumentUrl: {
      type: String,
      default: ""
    },
    uploadedDocumentStorage: {
      type: String,
      enum: ["LOCAL", "S3"],
      default: "LOCAL"
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
    },
    finalPayImpact: {
      type: String,
      enum: ["NONE", "UNPAID", "HALF_PAID", "FULLY_PAID"],
      default: "NONE"
    }
  },
  { timestamps: true }
);

// Index for efficient queries
requestSchema.index({ userId: 1, submittedAt: -1 });

export default mongoose.model("Request", requestSchema);
