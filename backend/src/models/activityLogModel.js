import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  userName: { type: String, default: "System" },
  userRole: { type: String, default: "" },
  userEmail: { type: String, default: "" },
  action: {
    type: String,
    enum: [
      "LOGIN", "LOGOUT",
      "CREATE", "UPDATE", "DELETE", "VIEW",
      "APPROVE", "REJECT", "EXPORT", "IMPORT",
      "PASSWORD_RESET", "FILE_UPLOAD", "FILE_DOWNLOAD"
    ],
    required: true
  },
  module: {
    type: String,
    enum: [
      "AUTH", "EMPLOYEE", "ATTENDANCE", "PAYROLL",
      "REQUESTS", "ASSETS", "DOCUMENTS", "REPORTS",
      "ANNOUNCEMENTS", "APPRAISALS", "WARNINGS",
      "MASTERS", "SETTINGS", "OTHER"
    ],
    default: "OTHER"
  },
  description: { type: String, default: "" },
  targetId: { type: String, default: "" },   // ID of the affected record
  targetName: { type: String, default: "" }, // Human-readable name of the record
  ipAddress: { type: String, default: "" },
  userAgent: { type: String, default: "" },
  status: {
    type: String,
    enum: ["SUCCESS", "FAILED"],
    default: "SUCCESS"
  },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

activityLogSchema.index({ user: 1, createdAt: -1 });
activityLogSchema.index({ module: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });

export default mongoose.model("ActivityLog", activityLogSchema);
