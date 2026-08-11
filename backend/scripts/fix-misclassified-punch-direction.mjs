/**
 * fix-misclassified-punch-direction.mjs
 *
 * PURPOSE:
 *   biometricSyncService.js used to classify every BioCloud punch's direction with
 *   `txn.Status === "Check-In" ? "IN" : "OUT"` - an exact-string match that only
 *   recognized the literal "Check-In". Any other Status value BioCloud actually sends
 *   (confirmed: "Overtime-In" - an evening/after-hours check-in - plus any record with
 *   a missing/blank Status) silently fell through to "OUT". That produced Attendance
 *   rows with checkIn:null / checkOut:<real time> and status "Absent" for people who
 *   did show up. biometricSyncService.js now uses `classifyPunchDirection`, which
 *   matches "in"/"out" appearing anywhere in the status text - this script re-derives
 *   the correct direction for every ALREADY-STORED BiometricTransaction and repairs
 *   both the transaction record and the Attendance rows built from it.
 *
 *   Rerunning reprocess-attendance.mjs alone is NOT enough: attendanceProcessor's
 *   merge logic takes the earliest checkIn and latest checkOut between the existing
 *   Attendance row and new data - so a bad existing checkOut would just merge with a
 *   newly-correct checkIn rather than being replaced. This script instead: (1) fixes
 *   transactionType on every affected BiometricTransaction, (2) deletes the corrupted
 *   Attendance row for every employee+date touched by a correction (skipping any row
 *   HR manually edited - isManuallyEdited is left untouched and reported separately),
 *   (3) reprocesses only those employee+dates from a clean slate so checkIn/checkOut/
 *   status get recomputed correctly from ALL of that day's (now-correct) transactions.
 *
 * USAGE:
 *   node scripts/fix-misclassified-punch-direction.mjs            # Preview mode (no DB writes)
 *   node scripts/fix-misclassified-punch-direction.mjs --apply     # Apply corrections to DB
 *
 * ENVIRONMENT:
 *   Reads DB_URL from .env
 */

import "dotenv/config";
import mongoose from "mongoose";
import BiometricTransaction from "../src/models/biometricTransactionModel.js";
import Attendance from "../src/models/attendanceModel.js";
import Employee from "../src/models/employeeModel.js";
import attendanceProcessor from "../src/services/attendanceProcessor.js";
import { classifyPunchDirection } from "../src/services/biometricSyncService.js";

const DB_URL = process.env.DB_URL;
const MODE = process.argv.includes("--apply") ? "apply" : "preview";

// UAE local date bucketing - mirrors attendanceProcessor.js's own +4h anchor exactly,
// so "which date does this transaction belong to" agrees with what actually got stored.
const uaeDateOf = (timestamp) => {
  const uaeTime = new Date(new Date(timestamp).getTime() + 4 * 60 * 60 * 1000);
  return uaeTime.toISOString().split("T")[0];
};

async function run() {
  if (!DB_URL) {
    console.error("DB_URL is not set in .env");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(DB_URL);
  console.log(`Connected: ${mongoose.connection.host} / ${mongoose.connection.name}`);
  console.log(`Mode: ${MODE.toUpperCase()}\n`);

  const total = await BiometricTransaction.countDocuments();
  console.log(`Scanning all ${total} biometric transactions...\n`);

  const cursor = BiometricTransaction.find().cursor();

  let scanned = 0;
  let mismatched = 0;
  const corrections = []; // { _id, badgeNumber, date, oldType, newType }
  const affectedKeys = new Set(); // `${badgeNumber}_${date}`

  let skippedOtherIntegration = 0;
  for await (const txn of cursor) {
    scanned++;

    // This collection holds transactions from TWO unrelated device integrations:
    // BioCloud (rawData.Status, VerifyTime, BadgeNumber - what biometricSyncService.js
    // actually talks to and what classifyPunchDirection's fix targets) and a separate
    // vendor (rawData.direction, employeeID, deviceSN - different devices/branches,
    // ingested by some other script). The second one already carries its own correct,
    // authoritative `direction` field and was NEVER affected by the Status-parsing bug -
    // reclassifying it based on a Status field it never had would corrupt good data.
    // Only touch records that actually have a Status field to begin with.
    if (txn.rawData?.Status === undefined) {
      skippedOtherIntegration++;
      continue;
    }

    const correctType = classifyPunchDirection(txn.rawData.Status, txn.transactionId);
    if (correctType !== txn.transactionType) {
      mismatched++;
      const date = uaeDateOf(txn.timestamp);
      corrections.push({
        _id: txn._id,
        badgeNumber: txn.badgeNumber,
        date,
        oldType: txn.transactionType,
        newType: correctType,
        status: txn.rawData?.Status
      });
      affectedKeys.add(`${txn.badgeNumber}_${date}`);
    }
  }

  console.log(`Scanned ${scanned} transactions (${skippedOtherIntegration} skipped - no Status field, belong to the other device integration, untouched).`);
  console.log(`Found ${mismatched} misclassified BioCloud transaction(s).`);
  console.log(`Affecting ${affectedKeys.size} distinct badge+date combination(s).\n`);

  console.log("Sample corrections (first 15):");
  for (const c of corrections.slice(0, 15)) {
    console.log(`  ${c.badgeNumber} ${c.date}: ${c.oldType} -> ${c.newType} (Status="${c.status}")`);
  }

  if (mismatched === 0) {
    console.log("\nNothing to fix.");
    await mongoose.disconnect();
    return;
  }

  if (MODE === "preview") {
    console.log("\nPreview only - re-run with --apply to fix these transactions and rebuild affected Attendance rows.");
    await mongoose.disconnect();
    return;
  }

  // --apply from here
  console.log("\nApplying transactionType corrections...");
  for (const c of corrections) {
    await BiometricTransaction.updateOne({ _id: c._id }, { $set: { transactionType: c.newType } });
  }
  console.log(`Corrected ${corrections.length} transaction(s).`);

  console.log("\nRebuilding affected Attendance rows...");
  let deleted = 0;
  let skippedManualEdit = 0;
  const skippedList = [];

  for (const key of affectedKeys) {
    const [badgeNumber, date] = key.split("_");
    const employee = await Employee.findOne({
      $or: [{ badgeNumber }, { code: badgeNumber }]
    });
    if (!employee) continue; // unmapped badge - reprocess-attendance.mjs already reports these separately

    const existing = await Attendance.findOne({ employee: employee._id, date });
    if (existing?.isManuallyEdited) {
      skippedManualEdit++;
      skippedList.push({ badgeNumber, date, employee: employee.name });
      continue;
    }
    if (existing) {
      await Attendance.deleteOne({ _id: existing._id });
      deleted++;
    }
  }

  console.log(`Deleted ${deleted} corrupted Attendance row(s) for a clean rebuild.`);
  if (skippedManualEdit > 0) {
    console.log(`Skipped ${skippedManualEdit} row(s) that were manually edited by HR - left untouched:`);
    for (const s of skippedList) console.log(`   ${s.employee} (${s.badgeNumber}) on ${s.date}`);
  }

  console.log("\nReprocessing all transactions for the affected badge+date combinations...");
  const affectedBadges = [...new Set(corrections.map((c) => c.badgeNumber))];
  const affectedTxns = await BiometricTransaction.find({ badgeNumber: { $in: affectedBadges } }).lean();
  // Only feed in transactions for the specific dates that were actually touched, so we
  // don't accidentally touch a same-badge different-date record that was fine already.
  const scoped = affectedTxns.filter((t) => affectedKeys.has(`${t.badgeNumber}_${uaeDateOf(t.timestamp)}`));

  const stats = await attendanceProcessor.processTransactions(scoped);
  console.log("Done.");
  console.log(`Created: ${stats.created}`);
  console.log(`Updated: ${stats.updated}`);
  console.log(`Skipped: ${stats.skipped}`);
  console.log(`Unmapped badges: ${stats.unmappedBadges.length}`, stats.unmappedBadges);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("\nScript failed:", err.message);
  mongoose.disconnect();
  process.exit(1);
});
