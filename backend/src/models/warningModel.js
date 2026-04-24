import mongoose from "mongoose";

const warningSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true
  },
  issuedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  warningType: {
    type: String,
    enum: ["Warning", "Written Warning", "Suspension", "Termination Notice", "Performance Improvement", "Other"],
    required: true
  },
  severity: {
    type: String,
    enum: ["Low", "Medium", "High", "Critical"],
    default: "Medium"
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  issuedDate: {
    type: Date,
    default: Date.now
  },
  // Optional attachment
  attachmentPath: { type: String, default: "" },
  attachmentUrl: { type: String, default: "" },
  attachmentStorage: { type: String, enum: ["LOCAL", "S3", ""], default: "" },
  attachmentName: { type: String, default: "" },
  // Status tracking
  status: {
    type: String,
    enum: ["Active", "Acknowledged", "Resolved", "Appealed"],
    default: "Active"
  },
  acknowledgedAt: { type: Date, default: null },
  resolvedAt: { type: Date, default: null },
  resolutionNote: { type: String, default: "" }
}, { timestamps: true });

warningSchema.index({ employeeId: 1, issuedDate: -1 });

export default mongoose.model("Warning", warningSchema);
