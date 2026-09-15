import mongoose from "mongoose";

// Mirrors backupJobModel.js's async-job shape - same reason: building the ZIP
// (one PDF per employee, each needing its own S3 logo fetch on cache-miss) can
// run long enough on production's real headcount/network that a single
// synchronous request gets killed by the reverse proxy (confirmed: nginx 504
// Gateway Time-out) before the response finishes. start/status/download splits
// it into three short requests instead of one long-held one.
const payslipExportJobSchema = new mongoose.Schema(
  {
    status: { type: String, enum: ["pending", "running", "ready", "failed"], default: "pending", required: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    requestedByName: { type: String },
    month: { type: Number },
    year: { type: Number },
    periodStart: { type: Date },
    periodEnd: { type: Date },
    employeeCount: { type: Number },
    skippedCount: { type: Number },
    s3Key: { type: String },
    fileName: { type: String },
    fileSize: { type: Number },
    error: { type: String },
    startedAt: { type: Date },
    completedAt: { type: Date }
  },
  { timestamps: true }
);

payslipExportJobSchema.index({ createdAt: -1 });

export default mongoose.model("PayslipExportJob", payslipExportJobSchema);
