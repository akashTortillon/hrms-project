import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import BiometricSyncState from "../models/biometricSyncStateModel.js";

async function run() {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log("Connected to MongoDB.");

    const provider = "leptis_attendance_api";
    
    // Find and update the sync state cursor to null
    const result = await BiometricSyncState.findOneAndUpdate(
      { provider },
      { $set: { lastAuthDateTime: null, lastUidOrSlno: null, lastRunStatus: null, lastError: null } },
      { new: true }
    );

    if (result) {
      console.log("Successfully reset biometric sync cursor:", result);
    } else {
      console.log("No biometric sync state found. It might have never run or uses a different provider string.");
    }
    
    process.exit(0);
  } catch (error) {
    console.error("Error resetting sync cursor:", error);
    process.exit(1);
  }
}

run();
