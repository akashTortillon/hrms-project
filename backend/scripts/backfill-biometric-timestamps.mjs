/**
 * backfill-biometric-timestamps.mjs
 *
 * PURPOSE:
 *   Corrects the `timestamp` field on every existing BiometricTransaction record.
 *   These were originally stored via `new Date(rawData.VerifyTime)` on a naive
 *   "YYYY-MM-DDTHH:mm:ss" string with no timezone offset - JS parses that as LOCAL
 *   time of whichever machine ran the sync, not UAE time (+04:00), so every stored
 *   timestamp is off by (server's local offset - 4h). This recomputes each record's
 *   `timestamp` from its own `rawData.VerifyTime` using the same fixed +04:00 anchor
 *   the live sync now uses (biometricSyncService.js's parseBioCloudTimestamp), so it
 *   stays correct no matter what machine this script runs on.
 *
 *   Does NOT touch transactionId, badgeNumber, transactionType, deviceId, or rawData -
 *   only `timestamp` is recalculated. Every other field on every record is left exactly
 *   as-is. Records with no `rawData.VerifyTime` to recompute from are left untouched
 *   and reported separately, never guessed at or deleted.
 *
 *   After running this with --apply, re-run scripts/reprocess-attendance.mjs to rebuild
 *   Attendance records from the now-corrected transactions (that script already merges
 *   check-in/check-out instead of overwriting, so it's safe to run against all history).
 *
 * USAGE:
 *   node scripts/backfill-biometric-timestamps.mjs            # Preview mode (no DB writes)
 *   node scripts/backfill-biometric-timestamps.mjs --apply     # Apply corrections to DB
 *
 * ENVIRONMENT:
 *   Reads DB_URL from .env
 */

import "dotenv/config";
import mongoose from "mongoose";
import BiometricTransaction from "../src/models/biometricTransactionModel.js";
import { parseBioCloudTimestamp } from "../src/services/biometricSyncService.js";

const DB_URL = process.env.DB_URL;
const MODE = process.argv.includes("--apply") ? "apply" : "preview";

async function run() {
  if (!DB_URL) {
    console.error("DB_URL is not set in .env");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(DB_URL);
  console.log(`Connected: ${mongoose.connection.host} / ${mongoose.connection.name}\n`);

  const total = await BiometricTransaction.countDocuments();
  console.log(`Scanning all ${total} biometric transactions...\n`);

  const cursor = BiometricTransaction.find().cursor();

  let scanned = 0;
  let alreadyCorrect = 0;
  let toCorrect = 0;
  let noRawVerifyTime = 0;
  let updated = 0;
  let failed = 0;
  const sampleCorrections = [];

  for await (const doc of cursor) {
    scanned++;
    const rawVerifyTime = doc.rawData?.VerifyTime;

    if (!rawVerifyTime) {
      noRawVerifyTime++;
      continue;
    }

    const correctTimestamp = parseBioCloudTimestamp(rawVerifyTime);
    if (!correctTimestamp || isNaN(correctTimestamp.getTime())) {
      noRawVerifyTime++;
      continue;
    }

    if (doc.timestamp && doc.timestamp.getTime() === correctTimestamp.getTime()) {
      alreadyCorrect++;
      continue;
    }

    toCorrect++;
    if (sampleCorrections.length < 10) {
      sampleCorrections.push({
        badgeNumber: doc.badgeNumber,
        rawVerifyTime,
        oldTimestamp: doc.timestamp?.toISOString() || null,
        newTimestamp: correctTimestamp.toISOString()
      });
    }

    if (MODE === "apply") {
      try {
        await BiometricTransaction.updateOne(
          { _id: doc._id },
          { $set: { timestamp: correctTimestamp } }
        );
        updated++;
      } catch (err) {
        failed++;
        console.error(`Failed to update ${doc._id}: ${err.message}`);
      }
    }

    if (scanned % 2000 === 0) {
      console.log(`Scanned ${scanned}/${total}...`);
    }
  }

  console.log("\nSample corrections (first 10):");
  console.log(JSON.stringify(sampleCorrections, null, 2));

  console.log(`\nSummary:`);
  console.log(`  Scanned:               ${scanned}`);
  console.log(`  Already correct:       ${alreadyCorrect}`);
  console.log(`  Needed correction:     ${toCorrect}`);
  console.log(`  No rawData.VerifyTime: ${noRawVerifyTime} (left untouched)`);

  if (MODE === "apply") {
    console.log(`  Updated:               ${updated}`);
    console.log(`  Failed:                ${failed}`);
    console.log(`\nDone. Now re-run: node scripts/reprocess-attendance.mjs`);
  } else {
    console.log(`\nPreview only - no DB writes made.`);
    console.log(`Run with --apply to correct these ${toCorrect} records:`);
    console.log(`    node scripts/backfill-biometric-timestamps.mjs --apply`);
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("\nScript failed:", err.message);
  mongoose.disconnect();
  process.exit(1);
});
