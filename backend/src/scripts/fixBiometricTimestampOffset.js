/**
 * Recomputes BiometricTransaction.timestamp for every row from rawData.authDateTime
 * using the corrected parseLeptisTimestamp (see biometricSyncService.js) and fixes any
 * row where the stored value drifted +4h because a "Z"-suffixed authDateTime was
 * wrongly trusted as true UTC instead of UAE-local time.
 *
 * Idempotent: rows where the stored timestamp is already correct are left untouched
 * and counted as "already correct". Safe to re-run.
 *
 * Only fixes BiometricTransaction.timestamp. Attendance.checkIn/checkOut/status/etc
 * are derived data and must be rebuilt separately AFTER this script, via:
 *   node src/scripts/backfillAttendanceFromBiometric.js --live
 *
 * SAFE BY DEFAULT: runs in DRY RUN — prints what would change, writes nothing.
 * Pass --live to actually apply the fixes.
 *
 * Usage:
 *   node src/scripts/fixBiometricTimestampOffset.js            # dry run
 *   node src/scripts/fixBiometricTimestampOffset.js --live      # apply
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import BiometricTransaction from "../models/biometricTransactionModel.js";
import { parseLeptisTimestamp } from "../services/biometricSyncService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const args = process.argv.slice(2);
const LIVE = args.includes("--live");
const uriArg = args.find(a => a.startsWith("--uri="));
const DB_URI = uriArg ? uriArg.split("=")[1] : process.env.DB_URL;

async function main() {
  await mongoose.connect(DB_URI);
  console.log(`Connected to: ${DB_URI}`);
  console.log(`Mode: ${LIVE ? "LIVE (will write)" : "DRY RUN (no writes)"}`);

  const cursor = BiometricTransaction.find({}).select("badgeNumber timestamp rawData.authDateTime").cursor();

  let total = 0, corrected = 0, alreadyCorrect = 0, skippedNoRaw = 0;
  const diffs = [];
  const bulkOps = [];

  for await (const txn of cursor) {
    total++;
    const rawAuthDateTime = txn.rawData?.authDateTime;
    if (!rawAuthDateTime) { skippedNoRaw++; continue; }

    const correctTimestamp = parseLeptisTimestamp(rawAuthDateTime);
    if (!correctTimestamp) { skippedNoRaw++; continue; }

    if (correctTimestamp.getTime() === new Date(txn.timestamp).getTime()) {
      alreadyCorrect++;
      continue;
    }

    corrected++;
    if (diffs.length < 50) {
      diffs.push({
        badgeNumber: txn.badgeNumber,
        rawAuthDateTime,
        before: new Date(txn.timestamp).toISOString(),
        after: correctTimestamp.toISOString()
      });
    }

    if (LIVE) {
      bulkOps.push({
        updateOne: {
          filter: { _id: txn._id },
          update: { $set: { timestamp: correctTimestamp } }
        }
      });
      if (bulkOps.length >= 500) {
        await BiometricTransaction.bulkWrite(bulkOps.splice(0, bulkOps.length));
      }
    }
  }
  if (LIVE && bulkOps.length > 0) {
    await BiometricTransaction.bulkWrite(bulkOps);
  }

  console.log("\n=== Diffs (first 50 shown) ===");
  for (const d of diffs) {
    console.log(`${d.badgeNumber}  raw="${d.rawAuthDateTime}"  before=${d.before}  after=${d.after}`);
  }
  if (corrected > 50) console.log(`... and ${corrected - 50} more`);

  console.log("\n=== Summary ===");
  console.log(`Total transactions scanned: ${total}`);
  console.log(`Corrected (were off by the Z-trust bug): ${corrected}`);
  console.log(`Already correct: ${alreadyCorrect}`);
  console.log(`Skipped — no rawData.authDateTime: ${skippedNoRaw}`);
  console.log(LIVE ? "\nLIVE MODE — all changes above were written." : "\nDRY RUN — nothing written. Re-run with --live to apply.");
  if (LIVE && corrected > 0) {
    console.log("\nNext: rebuild Attendance records from the corrected transactions:");
    console.log("  node src/scripts/backfillAttendanceFromBiometric.js --live");
  }

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
