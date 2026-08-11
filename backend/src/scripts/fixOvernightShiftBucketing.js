/**
 * Corrects Attendance records for employees on an overnight shift (start > end, e.g.
 * "Flexible" 05:00->03:00 or "AL AIN CUT DUTY 9 TO 1" 09:00->01:00). The existing
 * grouping (attendanceProcessor.js / backfillAttendanceFromBiometric.js) buckets punches
 * by the punch's own calendar date instead of the shift's start-anchored "shift day", so
 * a shift's checkout - which lands after midnight on the following calendar date - gets
 * attributed to the wrong day. Confirmed via auditOvernightShiftBucketing.js: ~59% of
 * overnight-shift shift-days are wrong, and most look like complete, plausible records
 * (both checkIn/checkOut populated) that are actually stitched together from two
 * different shift occurrences - not just the obvious checkIn-only/checkOut-only split.
 *
 * Recomputes correct shift-day bucketing directly from BiometricTransaction (same
 * algorithm as the audit script) and overwrites checkIn/checkOut/status/lateTier/
 * workHours wholesale for every affected shift-day - not a merge/patch, a full
 * recompute per bucket, same as backfillAttendanceFromBiometric.js does for normal
 * shifts. Scoped to only employees on an overnight shift; all other shifts untouched.
 *
 * SAFE BY DEFAULT: runs in DRY RUN - prints what would change, writes nothing.
 * Pass --live to actually apply the fixes.
 *
 * Usage:
 *   node src/scripts/fixOvernightShiftBucketing.js            # dry run
 *   node src/scripts/fixOvernightShiftBucketing.js --live      # apply
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Employee from "../models/employeeModel.js";
import Master from "../models/masterModel.js";
import Attendance from "../models/attendanceModel.js";
import BiometricTransaction from "../models/biometricTransactionModel.js";
import { getShiftRules, calculateLateTier, calculateDuration } from "../utils/attendanceUtils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const args = process.argv.slice(2);
const LIVE = args.includes("--live");
const uriArg = args.find(a => a.startsWith("--uri="));
const DB_URI = uriArg ? uriArg.split("=")[1] : process.env.DB_URL;

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

async function main() {
  await mongoose.connect(DB_URI);
  console.log(`Connected to: ${DB_URI}`);
  console.log(`Mode: ${LIVE ? "LIVE (will write)" : "DRY RUN (no writes)"}`);

  // 1. Overnight shift configs - same detection as the audit script.
  const shiftMasters = await Master.find({ type: "SHIFT" }).lean();
  const shiftConfig = new Map();
  for (const s of shiftMasters) {
    const startMin = toMinutes(s.metadata?.startTime || "09:00");
    const endMin = toMinutes(s.metadata?.endTime || "18:00");
    shiftConfig.set(s.name, { startMin, endMin, isOvernight: startMin > endMin });
  }
  const overnightShiftNames = new Set(
    Array.from(shiftConfig.entries()).filter(([, c]) => c.isOvernight).map(([name]) => name)
  );
  console.log(`Overnight shifts: ${Array.from(overnightShiftNames).join(", ") || "none"}`);

  const employees = await Employee.find({ shift: { $in: Array.from(overnightShiftNames) } });
  console.log(`Employees on an overnight shift: ${employees.length}`);
  const employeeByCode = new Map(employees.map(e => [e.code?.trim(), e]));
  const codes = Array.from(employeeByCode.keys());

  if (codes.length === 0) {
    console.log("No employees on overnight shifts - nothing to fix.");
    await mongoose.disconnect();
    return;
  }

  // 2. Raw punches, sorted so earliest-IN/latest-OUT can be picked up in one pass.
  const transactions = await BiometricTransaction.find({ badgeNumber: { $in: codes } })
    .select("badgeNumber timestamp transactionType")
    .sort({ badgeNumber: 1, timestamp: 1 })
    .lean();
  console.log(`Loaded ${transactions.length} raw punches for overnight-shift employees.`);

  // 3. Recompute correct shift-day bucketing (identical algorithm to the audit script).
  const grouped = new Map(); // "code_shiftDate" -> { code, shiftDate, checkIn, checkOut }
  let gapZoneCount = 0;

  for (const txn of transactions) {
    const code = txn.badgeNumber.trim();
    const employee = employeeByCode.get(code);
    if (!employee) continue;
    const cfg = shiftConfig.get(employee.shift);
    if (!cfg || !cfg.isOvernight) continue;

    const uaeTime = new Date(new Date(txn.timestamp).getTime() + 4 * 60 * 60 * 1000);
    const dateStr = uaeTime.toISOString().split("T")[0];
    const timeStr = uaeTime.toISOString().split("T")[1].substring(0, 5);
    const punchMin = toMinutes(timeStr);

    let shiftDate;
    if (punchMin >= cfg.startMin) {
      shiftDate = dateStr;
    } else if (punchMin < cfg.endMin) {
      const d = new Date(`${dateStr}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() - 1);
      shiftDate = d.toISOString().split("T")[0];
    } else {
      // Gap zone: OUT -> late tail of the shift that started the day before.
      //           IN  -> early arrival for the shift starting today.
      gapZoneCount++;
      if (txn.transactionType === "OUT") {
        const d = new Date(`${dateStr}T00:00:00Z`);
        d.setUTCDate(d.getUTCDate() - 1);
        shiftDate = d.toISOString().split("T")[0];
      } else {
        shiftDate = dateStr;
      }
    }

    const key = `${code}_${shiftDate}`;
    if (!grouped.has(key)) {
      grouped.set(key, { code, shiftDate, checkIn: null, checkOut: null });
    }
    const g = grouped.get(key);
    if (txn.transactionType === "IN") {
      if (!g.checkIn) g.checkIn = timeStr;
    } else if (txn.transactionType === "OUT") {
      g.checkOut = timeStr;
    }
  }
  console.log(`Gap-zone punches (reassigned by type): ${gapZoneCount}`);
  console.log(`Recomputed shift-day buckets: ${grouped.size}`);

  // 4. Overwrite Attendance wholesale for every affected shift-day.
  const shiftRulesCache = new Map();
  const getRulesCached = async (shiftName) => {
    if (!shiftRulesCache.has(shiftName)) {
      shiftRulesCache.set(shiftName, await getShiftRules(shiftName));
    }
    return shiftRulesCache.get(shiftName);
  };

  let changed = 0, created = 0, skippedManual = 0, skippedLeave = 0, skippedNoChange = 0;
  const diffs = [];

  for (const g of grouped.values()) {
    const employee = employeeByCode.get(g.code);
    const existing = await Attendance.findOne({ employee: employee._id, date: g.shiftDate });

    if (existing?.isManuallyEdited) { skippedManual++; continue; }
    if (existing?.status === "On Leave") { skippedLeave++; continue; }

    const rules = await getRulesCached(employee.shift);
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
        employee: employee.name, code: employee.code, shift: employee.shift, shiftDate: g.shiftDate,
        before: { checkIn: existing.checkIn, checkOut: existing.checkOut, status: existing.status },
        after: { checkIn: g.checkIn, checkOut: g.checkOut, status }
      });

      if (LIVE) {
        existing.checkIn = g.checkIn;
        existing.checkOut = g.checkOut;
        existing.status = status;
        existing.lateTier = lateTier;
        existing.workHours = workHours;
        await existing.save();
      }
      changed++;
    } else {
      diffs.push({
        employee: employee.name, code: employee.code, shift: employee.shift, shiftDate: g.shiftDate,
        before: null,
        after: { checkIn: g.checkIn, checkOut: g.checkOut, status }
      });
      if (LIVE) {
        await Attendance.create({
          employee: employee._id, date: g.shiftDate, shift: employee.shift,
          checkIn: g.checkIn, checkOut: g.checkOut, status, lateTier, workHours
        });
      }
      created++;
    }
  }

  console.log("\n=== Diffs (first 50 shown) ===");
  for (const d of diffs.slice(0, 50)) {
    console.log(`${d.shiftDate}  ${d.employee} (${d.code}, ${d.shift})`);
    console.log(`  before: checkIn=${d.before?.checkIn ?? "—"} checkOut=${d.before?.checkOut ?? "—"} status=${d.before?.status ?? "—"}`);
    console.log(`  after:  checkIn=${d.after.checkIn ?? "—"} checkOut=${d.after.checkOut ?? "—"} status=${d.after.status}`);
  }
  if (diffs.length > 50) console.log(`... and ${diffs.length - 50} more`);

  console.log("\n=== Summary ===");
  console.log(`Existing records changed: ${changed}`);
  console.log(`New records created (had punches, no Attendance row yet): ${created}`);
  console.log(`Skipped - manually edited (preserved): ${skippedManual}`);
  console.log(`Skipped - on approved leave (preserved): ${skippedLeave}`);
  console.log(`Skipped - already correct: ${skippedNoChange}`);
  console.log(LIVE ? "\nLIVE MODE - all changes above were written." : "\nDRY RUN - nothing written. Re-run with --live to apply.");

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
