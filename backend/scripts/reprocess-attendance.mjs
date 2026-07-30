/**
 * reprocess-attendance.mjs (Leptis branch)
 *
 * PURPOSE:
 *   Rebuilds Attendance records from every stored BiometricTransaction, in a SINGLE
 *   processTransactions() call - not chunked/re-synced batch by batch. The live sync
 *   only ever hands attendanceProcessor whatever's new since the last cursor, which is
 *   exactly what let a checkout-only batch stomp an already-recorded check-in before the
 *   merge fix landed. Feeding it the full history at once avoids that same hazard here:
 *   every check-in/check-out pair for a given employee+day is grouped and written together.
 *
 *   Run this AFTER backfill-biometric-timestamps.mjs --apply, so it operates on corrected
 *   timestamps rather than the original timezone-shifted ones.
 *
 *   Does not delete any Attendance record. Manually-edited records (isManuallyEdited)
 *   are left untouched by attendanceProcessor itself, same as during normal sync.
 *
 * USAGE:
 *   node scripts/reprocess-attendance.mjs
 *
 * ENVIRONMENT:
 *   Reads DB_URL from .env
 */

import "dotenv/config";
import mongoose from "mongoose";
import BiometricTransaction from "../src/models/biometricTransactionModel.js";
import attendanceProcessor from "../src/services/attendanceProcessor.js";

const DB_URL = process.env.DB_URL;

async function run() {
  if (!DB_URL) {
    console.error("DB_URL is not set in .env");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(DB_URL);
  console.log(`Connected: ${mongoose.connection.host} / ${mongoose.connection.name}\n`);

  const total = await BiometricTransaction.countDocuments();
  console.log(`Loading all ${total} biometric transactions...`);

  const transactions = await BiometricTransaction.find().sort({ timestamp: 1 });
  console.log(`Loaded ${transactions.length}. Reprocessing into Attendance records...\n`);

  const stats = await attendanceProcessor.processTransactions(transactions);

  console.log("Done.");
  console.log(`  Created:         ${stats.created}`);
  console.log(`  Updated:         ${stats.updated}`);
  console.log(`  Skipped:         ${stats.skipped}`);
  console.log(`  Unmapped badges: ${stats.unmappedBadges.length ? stats.unmappedBadges.join(", ") : "none"}`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("\nScript failed:", err.message);
  mongoose.disconnect();
  process.exit(1);
});
