import mongoose from "mongoose";

const syncHistorySchema = new mongoose.Schema(
  {
    syncType: {
      type: String,
      enum: ["SCHEDULED", "MANUAL"],
      required: true
    },
    startTime: {
      type: Date,
      required: true,
      index: true
    },
    endTime: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ["SUCCESS", "PARTIAL_SUCCESS", "FAILED"],
      required: true,
      index: true
    },
    transactionsFetched: {
      type: Number,
      default: 0
    },
    transactionsStored: {
      type: Number,
      default: 0
    },
    recordsCreated: {
      type: Number,
      default: 0
    },
    recordsUpdated: {
      type: Number,
      default: 0
    },
    recordsSkipped: {
      type: Number,
      default: 0
    },
    unmappedBadges: {
      type: [String],
      default: []
    },
    errorMessage: {
      type: String,
      default: null
    },
    errorStack: {
      type: String,
      default: null
    },
    triggeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  {
    timestamps: true
  }
);

syncHistorySchema.index({ startTime: -1 });
syncHistorySchema.index({ status: 1, startTime: -1 });

export default mongoose.model("SyncHistory", syncHistorySchema);
