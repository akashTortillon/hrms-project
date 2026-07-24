/**
 * reprocess-attendance.mjs
 *
 * PURPOSE:
 *   Re-runs every stored BiometricTransaction through attendanceProcessor to turn
 *   any that never produced an Attendance record into one. Needed because
 *   biometricSyncService.js marks a transaction `processed = true` even when its
 *   badge couldn't be matched to an Employee at sync time, so those punches never
 *   get a retry on their own - this catches them up in one pass, for ALL stored
 *   transactions (not scoped to one badge or one date), now that
 *   attendanceProcessor.js also matches on Employee.code as a fallback when
 *   badgeNumber isn't set.
 *
 *   Runs everything in a single processTransactions() call rather than in chunks:
 *   chunking by a fixed batch size can split an employee's check-in and check-out
 *   for the same day across two batches, and the second batch's update would
 *   overwrite the other side with null. A single pass avoids that entirely.
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
  console.log(`Loading all ${total} stored biometric transactions...`);

  const transactions = await BiometricTransaction.find().lean();
  console.log(`Loaded ${transactions.length}. Reprocessing...\n`);

  const stats = await attendanceProcessor.processTransactions(transactions);

  console.log("Done.");
  console.log(`Created: ${stats.created}`);
  console.log(`Updated: ${stats.updated}`);
  console.log(`Skipped (no change / on leave / manually edited): ${stats.skipped}`);
  console.log(`Still unmapped badges (${stats.unmappedBadges.length}):`, stats.unmappedBadges);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("\nScript failed:", err.message);
  mongoose.disconnect();
  process.exit(1);
});
