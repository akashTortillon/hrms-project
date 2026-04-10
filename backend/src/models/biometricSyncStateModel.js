import mongoose from "mongoose";

const biometricSyncStateSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    lastAuthDateTime: {
      type: Date,
      default: null
    },
    lastUidOrSlno: {
      type: Number,
      default: null
    },
    lastRunAt: {
      type: Date,
      default: null
    },
    lastRunStatus: {
      type: String,
      enum: ["success", "fail"],
      default: null
    },
    lastError: {
      type: String,
      default: null
    }
  },
  { timestamps: true }
);

export default mongoose.model("BiometricSyncState", biometricSyncStateSchema);

