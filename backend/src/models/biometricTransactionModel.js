import mongoose from "mongoose";

const biometricTransactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: Number,
      required: true,
      unique: true,
      index: true
    },
    badgeNumber: {
      type: String,
      required: true,
      index: true
    },
    timestamp: {
      type: Date,
      required: true,
      index: true
    },
    transactionType: {
      type: String,
      enum: ["IN", "OUT"],
      required: true
    },
    deviceId: {
      type: String,
      default: null
    },
    syncedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    processed: {
      type: Boolean,
      default: false,
      index: true
    },
    processedAt: {
      type: Date,
      default: null
    },
    rawData: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for optimization
biometricTransactionSchema.index({ badgeNumber: 1, timestamp: 1 });
biometricTransactionSchema.index({ syncedAt: 1, processed: 1 });

export default mongoose.model("BiometricTransaction", biometricTransactionSchema);
