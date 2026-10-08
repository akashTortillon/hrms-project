/**
 * Rebuilds Attendance rows from the raw BiometricTransaction records already stored in
 * the DB (the ground truth), using the exact same shift-occurrence logic as live sync
 * (services/attendanceProcessor.js) - this script no longer carries its own copy.
 *
 * Punches are bucketed per the employee's shift Master (startTime/endTime), so a check-out
 * after midnight stays on the row of the shift it belongs to.
 *
 * SAFE BY DEFAULT: runs in DRY RUN - prints what would change, writes nothing.
 * Pass --live to actually apply. Manually edited rows and approved-leave days are kept.
 *
 * Rows created by the OLD calendar-day bucketing can be left orphaned (e.g. a row that only
 * exists because of a 01:18 tail punch that now belongs to the previous day's shift). They
 * are always LISTED; pass --prune-stale (with --live) to delete them.
 *
 * Usage:
 *   node src/scripts/backfillAttendanceFromBiometric.js --from=2026-09-29 --to=2026-10-02          # dry run
 *   node src/scripts/backfillAttendanceFromBiometric.js --live --from=2026-09-29 --to=2026-10-02   # apply
 *   node src/scripts/backfillAttendanceFromBiometric.js --live --prune-stale --from=... --to=...   # apply + delete orphans
 *   node src/scripts/backfillAttendanceFromBiometric.js --from=2026-09-30 --badge=T03                # check ONE employee (dry run)
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Attendance from "../models/attendanceModel.js";
import Employee from "../models/employeeModel.js";
import BiometricTransaction from "../models/biometricTransactionModel.js";
import attendanceProcessor from "../services/attendanceProcessor.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const args = process.argv.slice(2);
const LIVE = args.includes("--live");
const PRUNE_STALE = args.includes("--prune-stale");
const fromArg = args.find(a => a.startsWith("--from="));
const toArg = args.find(a => a.startsWith("--to="));
const badgeArg = args.find(a => a.startsWith("--badge="));
const BADGE = badgeArg ? badgeArg.split("=")[1].trim() : null; // limit to one employee, e.g. --badge=T03
const uriArg = args.find(a => a.startsWith("--uri="));
const FROM_DATE = fromArg ? fromArg.split("=")[1] : null; // "YYYY-MM-DD" UAE date, inclusive
const TO_DATE = toArg ? toArg.split("=")[1] : null;       // "YYYY-MM-DD" UAE date, inclusive
const DB_URI = uriArg ? uriArg.split("=")[1] : process.env.DB_URL; // --uri= overrides .env DB_URL

async function main() {
  await mongoose.connect(DB_URI);
  console.log(`Connected to: ${DB_URI}`);
  console.log(`Mode: ${LIVE ? "LIVE (will write)" : "DRY RUN (no writes)"}${PRUNE_STALE ? " + prune stale" : ""}`);
  if (FROM_DATE || TO_DATE) console.log(`Date range (UAE): ${FROM_DATE || "start"} to ${TO_DATE || "today"}`);

  const txnQuery = {};
  if (BADGE) {
    txnQuery.badgeNumber = BADGE;
    console.log(`Employee filter: badge ${BADGE} only`);
  }
  if (FROM_DATE || TO_DATE) {
    txnQuery.timestamp = {};
    if (FROM_DATE) txnQuery.timestamp.$gte = new Date(`${FROM_DATE}T00:00:00+04:00`);
    if (TO_DATE) txnQuery.timestamp.$lte = new Date(`${TO_DATE}T23:59:59.999+04:00`);
  }

  const transactions = await BiometricTransaction.find(txnQuery)
    .select("badgeNumber timestamp rawData")
    .sort({ badgeNumber: 1, timestamp: 1 })
    .lean();
  console.log(`Loaded ${transactions.length} raw biometric transactions.`);

  // Always dry-run first so the diff is computed before anything is written, then (live) apply.
  const preview = await attendanceProcessor.processTransactions(transactions, { dryRun: true, returnKeys: true });

  console.log("\n=== Diffs (first 50 shown) ===");
  for (const d of preview.diffs.slice(0, 50)) {
    console.log(`${d.date}  ${d.employee} (${d.code})`);
    console.log(`  before: checkIn=${d.before?.checkIn ?? "—"} checkOut=${d.before?.checkOut ?? "—"} status=${d.before?.status ?? "—"}`);
    console.log(`  after:  checkIn=${d.after.checkIn ?? "—"} checkOut=${d.after.checkOut ?? "—"}${d.after.nextDay ? " (next day)" : ""} status=${d.after.status}`);
  }
  if (preview.diffs.length > 50) console.log(`... and ${preview.diffs.length - 50} more`);

  // Orphans: biometric-derived rows in range that no shift occurrence maps to any more.
  const touched = new Set(preview.touchedKeys);
  const rowQuery = {
    isManuallyEdited: { $ne: true },
    status: { $in: ["Present", "Late", "Incomplete"] },
    checkIn: { $ne: null }
  };
  if (BADGE) {
    const ids = (await Employee.find({ $or: [{ badgeNumber: BADGE }, { code: BADGE }] }).select("_id").lean()).map(e => e._id);
    rowQuery.employee = { $in: ids };
  }
  if (FROM_DATE || TO_DATE) {
    rowQuery.date = {};
    if (FROM_DATE) rowQuery.date.$gte = FROM_DATE;
    if (TO_DATE) rowQuery.date.$lte = TO_DATE;
  }
  const rows = await Attendance.find(rowQuery).populate("employee", "name code").lean();
  const stale = rows.filter(r => r.employee && !touched.has(`${r.employee._id}_${r.date}`));

  console.log(`\n=== Orphaned rows from old calendar-day bucketing (${stale.length}) ===`);
  for (const r of stale.slice(0, 50)) {
    console.log(`${r.date}  ${r.employee.name} (${r.employee.code})  checkIn=${r.checkIn} checkOut=${r.checkOut ?? "—"} status=${r.status}`);
  }
  if (stale.length > 50) console.log(`... and ${stale.length - 50} more`);

  console.log("\n=== Summary ===");
  console.log(`Rows that would change: ${preview.updated}`);
  console.log(`Rows that would be created: ${preview.created}`);
  console.log(`Skipped (already correct / manually edited / on leave): ${preview.skipped}`);
  console.log(`Unmatched badge numbers (no Employee record): ${preview.unmappedBadges.length}`);
  console.log(`Orphaned rows: ${stale.length}${PRUNE_STALE ? " (will be deleted)" : " (kept - pass --prune-stale to delete)"}`);

  if (LIVE) {
    await attendanceProcessor.processTransactions(transactions);
    if (PRUNE_STALE && stale.length) {
      await Attendance.deleteMany({ _id: { $in: stale.map(r => r._id) } });
    }
    console.log("\nLIVE MODE - all changes above were written.");
  } else {
    console.log("\nDRY RUN - nothing written. Re-run with --live to apply.");
  }

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
