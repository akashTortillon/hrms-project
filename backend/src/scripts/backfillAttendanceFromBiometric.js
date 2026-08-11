/**
 * Backfills Attendance.checkIn/checkOut for every employee+date from the raw
 * BiometricTransaction records already stored in the DB — the ground truth —
 * instead of trying to detect/patch the already-corrupted Attendance fields.
 *
 * Root cause (fixed in attendanceProcessor.js): the cross-sync-batch merge used
 * "this batch's checkIn wins if present" instead of "earliest checkIn wins,
 * latest checkOut wins". Any employee whose check-in landed in more than one
 * sync batch for the same day could have their real check-in silently
 * overwritten by a later stray/duplicate IN punch. This script recomputes the
 * correct values for every historical day and reports the diff.
 *
 * SAFE BY DEFAULT: runs in DRY RUN — prints what would change, writes nothing.
 * Pass --live to actually apply the fixes.
 *
 * Usage:
 *   node src/scripts/backfillAttendanceFromBiometric.js            # dry run
 *   node src/scripts/backfillAttendanceFromBiometric.js --live      # apply
 *   node src/scripts/backfillAttendanceFromBiometric.js --live --from=2026-07-01 --to=2026-07-30
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Employee from "../models/employeeModel.js";
import Attendance from "../models/attendanceModel.js";
import BiometricTransaction from "../models/biometricTransactionModel.js";
import { getShiftRules, calculateLateTier, calculateDuration, computeShiftDayBucket } from "../utils/attendanceUtils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const args = process.argv.slice(2);
const LIVE = args.includes("--live");
const fromArg = args.find(a => a.startsWith("--from="));
const toArg = args.find(a => a.startsWith("--to="));
const uriArg = args.find(a => a.startsWith("--uri="));
const FROM_DATE = fromArg ? fromArg.split("=")[1] : null; // "YYYY-MM-DD", inclusive
const TO_DATE = toArg ? toArg.split("=")[1] : null;       // "YYYY-MM-DD", inclusive
const DB_URI = uriArg ? uriArg.split("=")[1] : process.env.DB_URL; // --uri= overrides .env DB_URL

async function main() {
  await mongoose.connect(DB_URI);
  console.log(`Connected to: ${DB_URI}`);
  console.log(`Mode: ${LIVE ? "LIVE (will write)" : "DRY RUN (no writes)"}`);
  if (FROM_DATE || TO_DATE) console.log(`Date range: ${FROM_DATE || "start"} to ${TO_DATE || "today"}`);

  // 1. Pull every raw transaction, sorted chronologically per badge, and re-bucket into
  //    true earliest-IN / latest-OUT per employee+shift-day.
  const txnQuery = {};
  if (FROM_DATE || TO_DATE) {
    txnQuery.timestamp = {};
    if (FROM_DATE) txnQuery.timestamp.$gte = new Date(`${FROM_DATE}T00:00:00Z`);
    if (TO_DATE) txnQuery.timestamp.$lte = new Date(`${TO_DATE}T23:59:59Z`);
  }

  const transactions = await BiometricTransaction.find(txnQuery)
    .select("badgeNumber timestamp transactionType")
    .sort({ badgeNumber: 1, timestamp: 1 })
    .lean();
  console.log(`Loaded ${transactions.length} raw biometric transactions.`);

  // 2. Match employees once, up front - bucketing needs each employee's shift
  //    start/end (see computeShiftDayBucket) to correctly place a punch into the right
  //    shift-day for overnight shifts (e.g. "Flexible" 05:00->03:00), where the checkout
  //    lands on the following calendar date and naive calendar-day bucketing would split
  //    one shift occurrence's check-in and check-out across two Attendance rows.
  const badgeCodes = Array.from(new Set(transactions.map(t => t.badgeNumber.trim())));
  const employees = await Employee.find({
    $or: [{ badgeNumber: { $in: badgeCodes } }, { code: { $in: badgeCodes } }]
  });
  const employeeByBadge = new Map();
  for (const e of employees) {
    if (e.badgeNumber) employeeByBadge.set(e.badgeNumber.trim(), e);
    if (e.code) employeeByBadge.set(e.code.trim(), e);
  }

  const shiftRulesCache = new Map();
  const getRulesCached = async (shiftName) => {
    if (!shiftRulesCache.has(shiftName)) {
      shiftRulesCache.set(shiftName, await getShiftRules(shiftName));
    }
    return shiftRulesCache.get(shiftName);
  };

  const grouped = new Map(); // "badge_shiftDate" -> { badgeNumber, date, checkIn, checkOut }
  for (const txn of transactions) {
    const code = txn.badgeNumber.trim();
    const uaeTime = new Date(new Date(txn.timestamp).getTime() + 4 * 60 * 60 * 1000);
    const dateStr = uaeTime.toISOString().split("T")[0];
    const timeStr = uaeTime.toISOString().split("T")[1].substring(0, 5);

    const employee = employeeByBadge.get(code);
    const rules = await getRulesCached(employee?.shift || "Day Shift");
    const shiftDate = computeShiftDayBucket(dateStr, timeStr, txn.transactionType, rules);
    const key = `${code}_${shiftDate}`;

    if (!grouped.has(key)) {
      grouped.set(key, { badgeNumber: code, date: shiftDate, checkIn: null, checkOut: null });
    }
    const g = grouped.get(key);
    // transactions are pre-sorted by (badgeNumber, timestamp) ascending, so within a key
    // the first IN seen is chronologically earliest and each OUT seen overwrites the
    // previous one to end up as the chronologically latest - no string HH:MM comparison
    // needed (which would break for an overnight shift-day bucket spanning two calendar
    // dates, e.g. "22:00" > "01:00" as strings even though 01:00 the next day is later).
    if (txn.transactionType === "IN") {
      if (!g.checkIn) g.checkIn = timeStr;
    } else if (txn.transactionType === "OUT") {
      g.checkOut = timeStr;
    }
  }
  console.log(`Recomputed ${grouped.size} true employee-shift-day check-in/check-out pairs from raw punches.`);

  let changed = 0, skippedManual = 0, skippedLeave = 0, skippedNoChange = 0, unmatched = 0, created = 0;
  const diffs = [];

  for (const g of grouped.values()) {
    const employee = employeeByBadge.get(g.badgeNumber);
    if (!employee) { unmatched++; continue; }

    const existing = await Attendance.findOne({ employee: employee._id, date: g.date });

    if (existing?.isManuallyEdited) { skippedManual++; continue; }
    if (existing?.status === "On Leave") { skippedLeave++; continue; }

    const shiftName = employee.shift || "Day Shift";
    const rules = await getRulesCached(shiftName);

    let status = "Absent", lateTier = 0;
    if (g.checkIn) {
      lateTier = calculateLateTier(g.checkIn, rules);
      status = lateTier > 0 ? "Late" : "Present";
    }
    const workHours = calculateDuration(g.checkIn, g.checkOut);

    if (existing) {
      const noChange = existing.checkIn === g.checkIn && existing.checkOut === g.checkOut &&
        existing.status === status && existing.lateTier === lateTier && existing.workHours === workHours;
      if (noChange) { skippedNoChange++; continue; }

      diffs.push({
        employee: employee.name, code: employee.code, date: g.date,
        before: { checkIn: existing.checkIn, checkOut: existing.checkOut, status: existing.status },
        after: { checkIn: g.checkIn, checkOut: g.checkOut, status }
      });

      if (LIVE) {
        existing.checkIn = g.checkIn;
        existing.checkOut = g.checkOut;
        existing.status = status;
        existing.lateTier = lateTier;
        existing.workHours = workHours;
        existing.shift = shiftName;
        await existing.save();
      }
      changed++;
    } else {
      diffs.push({
        employee: employee.name, code: employee.code, date: g.date,
        before: null,
        after: { checkIn: g.checkIn, checkOut: g.checkOut, status }
      });
      if (LIVE) {
        await Attendance.create({
          employee: employee._id, date: g.date, shift: shiftName,
          checkIn: g.checkIn, checkOut: g.checkOut, status, lateTier, workHours
        });
      }
      created++;
    }
  }

  console.log("\n=== Diffs (first 50 shown) ===");
  for (const d of diffs.slice(0, 50)) {
    console.log(`${d.date}  ${d.employee} (${d.code})`);
    console.log(`  before: checkIn=${d.before?.checkIn ?? "—"} checkOut=${d.before?.checkOut ?? "—"} status=${d.before?.status ?? "—"}`);
    console.log(`  after:  checkIn=${d.after.checkIn ?? "—"} checkOut=${d.after.checkOut ?? "—"} status=${d.after.status}`);
  }
  if (diffs.length > 50) console.log(`... and ${diffs.length - 50} more`);

  console.log("\n=== Summary ===");
  console.log(`Existing records that would change: ${changed}`);
  console.log(`New records that would be created (had punches, no Attendance row yet): ${created}`);
  console.log(`Skipped — manually edited (preserved): ${skippedManual}`);
  console.log(`Skipped — on approved leave (preserved): ${skippedLeave}`);
  console.log(`Skipped — already correct: ${skippedNoChange}`);
  console.log(`Unmatched badge numbers (no Employee record): ${unmatched}`);
  console.log(LIVE ? "\nLIVE MODE — all changes above were written." : "\nDRY RUN — nothing written. Re-run with --live to apply.");

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
