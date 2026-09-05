import mongoose from "mongoose";

const backupJobSchema = new mongoose.Schema(
  {
    status: { type: String, enum: ["pending", "running", "ready", "failed"], default: "pending", required: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    requestedByName: { type: String },
    collectionsCount: { type: Number },
    s3Key: { type: String },
    fileSize: { type: Number },
    error: { type: String },
    startedAt: { type: Date },
    completedAt: { type: Date }
  },
  { timestamps: true }
);

backupJobSchema.index({ createdAt: -1 });

export default mongoose.model("BackupJob", backupJobSchema);
