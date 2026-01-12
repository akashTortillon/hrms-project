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
    }
  },
  { timestamps: true }
);

// Index for efficient queries
requestSchema.index({ userId: 1, submittedAt: -1 });

export default mongoose.model("Request", requestSchema);

