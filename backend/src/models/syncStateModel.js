import mongoose from "mongoose";

const syncStateSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "attendance_sync"
    },
    lastSyncedTransactionId: {
      type: Number,
      required: true,
      default: 0
    },
    lastSyncedAuthDateTime: {
      type: Date,
      default: null
    },
    lastSyncTimestamp: {
      type: Date,
      required: true,
      default: Date.now
    },
    lastSuccessfulSync: {
      type: Date,
      default: null
    },
    consecutiveFailures: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("SyncState", syncStateSchema);
