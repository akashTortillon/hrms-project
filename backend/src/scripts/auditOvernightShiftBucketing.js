/**
 * READ-ONLY AUDIT. Finds employee-days where an overnight shift (start > end, e.g.
 * "Flexible" 05:00->03:00 or "AL AIN CUT DUTY 9 TO 1" 09:00->01:00) got its check-in and
 * check-out split across two Attendance rows because the existing grouping buckets
 * punches by the punch's own calendar date instead of the shift's start-anchored
 * "shift day". A shift that starts at 20:00 and ends at 03:00 the next morning has its
 * checkout landing on the following calendar date - the current code creates a
 * checkIn-only row on day N and a checkOut-only row on day N+1 instead of one row.
 *
 * For each employee on an overnight shift, recomputes the correct shift-day bucketing
 * directly from BiometricTransaction and diffs it against what's actually stored in
 * Attendance today. Writes nothing - use this to size the problem before building the
 * correction script.
 *
 * Usage:
 *   node src/scripts/auditOvernightShiftBucketing.js
 *   node src/scripts/auditOvernightShiftBucketing.js --from=2026-07-01 --to=2026-08-11
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Employee from "../models/employeeModel.js";
import Master from "../models/masterModel.js";
import Attendance from "../models/attendanceModel.js";
import BiometricTransaction from "../models/biometricTransactionModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const args = process.argv.slice(2);
const fromArg = args.find(a => a.startsWith("--from="));
const toArg = args.find(a => a.startsWith("--to="));
const uriArg = args.find(a => a.startsWith("--uri="));
const FROM_DATE = fromArg ? fromArg.split("=")[1] : null;
const TO_DATE = toArg ? toArg.split("=")[1] : null;
const DB_URI = uriArg ? uriArg.split("=")[1] : process.env.DB_URL;

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

async function main() {
  await mongoose.connect(DB_URI);
  console.log(`Connected to: ${DB_URI}`);
  if (FROM_DATE || TO_DATE) console.log(`Date range: ${FROM_DATE || "start"} to ${TO_DATE || "today"}`);

  // 1. Load shift configs, flag which ones are overnight (start > end).
  const shiftMasters = await Master.find({ type: "SHIFT" }).lean();
  const shiftConfig = new Map(); // name -> { startMin, endMin, isOvernight }
  for (const s of shiftMasters) {
    const startMin = toMinutes(s.metadata?.startTime || "09:00");
    const endMin = toMinutes(s.metadata?.endTime || "18:00");
    shiftConfig.set(s.name, { startMin, endMin, isOvernight: startMin > endMin });
  }
  const overnightShiftNames = new Set(
    Array.from(shiftConfig.entries()).filter(([, c]) => c.isOvernight).map(([name]) => name)
  );
  console.log(`Overnight shifts found: ${Array.from(overnightShiftNames).join(", ") || "none"}`);

  // 2. Employees on an overnight shift.
  const employees = await Employee.find({ shift: { $in: Array.from(overnightShiftNames) } }).lean();
  console.log(`Employees on an overnight shift: ${employees.length}`);
  const employeeByCode = new Map(employees.map(e => [e.code?.trim(), e]));
  const codes = Array.from(employeeByCode.keys());

  if (codes.length === 0) {
    console.log("No employees on overnight shifts - nothing to audit.");
    await mongoose.disconnect();
    return;
  }

  // 3. Raw punches for those employees.
  const txnQuery = { badgeNumber: { $in: codes } };
  if (FROM_DATE || TO_DATE) {
    txnQuery.timestamp = {};
    if (FROM_DATE) txnQuery.timestamp.$gte = new Date(`${FROM_DATE}T00:00:00Z`);
    if (TO_DATE) txnQuery.timestamp.$lte = new Date(`${TO_DATE}T23:59:59Z`);
  }
  const transactions = await BiometricTransaction.find(txnQuery)
    .select("badgeNumber timestamp transactionType")
    .sort({ badgeNumber: 1, timestamp: 1 })
    .lean();
  console.log(`Loaded ${transactions.length} raw punches for overnight-shift employees.`);

  // 4. Recompute correct shift-day bucketing.
  //    For an overnight shift (startMin > endMin):
  //      - punch time >= startMin  -> belongs to shift-day = punch's own local date
  //      - punch time <  endMin    -> belongs to shift-day = punch's own local date - 1
  //      - endMin <= punch time < startMin -> outside any shift window ("gap zone"),
  //        flagged separately rather than guessed.
  const grouped = new Map(); // "code_shiftDate" -> { code, shiftDate, checkIn, checkOut }
  let gapZoneCount = 0;
  const gapZoneSamples = [];

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
      // Gap zone (between shift end and shift start) is not truly ambiguous once you
      // account for punch type: an OUT here is a late tail-end checkout of the shift
      // that started the day before (extend the end-boundary grace); an IN here is an
      // early arrival for the shift about to start today (extend the start-boundary
      // grace). Only genuinely unclassifiable if this assumption is wrong for a given
      // employee - samples are still printed below for a sanity check.
      gapZoneCount++;
      if (gapZoneSamples.length < 20) {
        gapZoneSamples.push({ code, shift: employee.shift, dateStr, timeStr, type: txn.transactionType });
      }
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
    // transactions are pre-sorted by (badgeNumber, timestamp) ascending, so within a
    // key the first IN seen is chronologically earliest, and each OUT seen overwrites
    // the previous one to end up as the chronologically latest - no string HH:MM
    // comparison needed (which would break across the midnight boundary anyway).
    if (txn.transactionType === "IN") {
      if (!g.checkIn) g.checkIn = timeStr;
    } else if (txn.transactionType === "OUT") {
      g.checkOut = timeStr;
    }
  }

  console.log(`\nGap-zone punches (fall between shift end and shift start - not auto-assigned): ${gapZoneCount}`);
  for (const s of gapZoneSamples) {
    console.log(`  ${s.code} (${s.shift}) ${s.dateStr} ${s.timeStr} ${s.type}`);
  }
  if (gapZoneCount > gapZoneSamples.length) console.log(`  ... and ${gapZoneCount - gapZoneSamples.length} more`);

  console.log(`\nRecomputed shift-day buckets: ${grouped.size}`);

  // 5. For each corrected shift-day bucket, compare directly against whatever's
  //    currently stored in Attendance for that shiftDate - not just the narrow
  //    "checkIn-only + checkOut-only on the next day" signature. The old calendar-day
  //    bucketing usually gets REFILLED by the next shift occurrence's own check-in, so
  //    most affected days look like complete, plausible records that are actually
  //    stitched together from two different shift occurrences. Missing that class was
  //    the mistake in the first pass of this script.
  let matches = 0;
  let missing = 0;
  let mismatchClean = 0;   // current record empty on the side that's wrong (old "split" signature)
  let mismatchSilent = 0;  // current record has BOTH fields populated but at least one is wrong
  const mismatchSamples = { clean: [], silent: [] };

  for (const g of grouped.values()) {
    const employee = employeeByCode.get(g.code);
    const attCurrent = await Attendance.findOne({ employee: employee._id, date: g.shiftDate }).lean();

    if (!attCurrent) {
      missing++;
      continue;
    }
    if (attCurrent.isManuallyEdited) continue; // out of scope - preserved either way

    const checkInMatches = attCurrent.checkIn === g.checkIn;
    const checkOutMatches = attCurrent.checkOut === g.checkOut;

    if (checkInMatches && checkOutMatches) {
      matches++;
      continue;
    }

    const bothCurrentlyPopulated = attCurrent.checkIn && attCurrent.checkOut;
    const sample = {
      employee: employee.name, code: employee.code, shift: employee.shift,
      shiftDate: g.shiftDate,
      current: { checkIn: attCurrent.checkIn, checkOut: attCurrent.checkOut },
      corrected: { checkIn: g.checkIn, checkOut: g.checkOut }
    };

    if (bothCurrentlyPopulated) {
      mismatchSilent++;
      if (mismatchSamples.silent.length < 30) mismatchSamples.silent.push(sample);
    } else {
      mismatchClean++;
      if (mismatchSamples.clean.length < 15) mismatchSamples.clean.push(sample);
    }
  }

  console.log("\n=== SILENT mismatches - current record looks complete but is wrong (first 30) ===");
  for (const s of mismatchSamples.silent) {
    console.log(`${s.employee} (${s.code}, ${s.shift}) - shift day ${s.shiftDate}`);
    console.log(`  current:   checkIn=${s.current.checkIn ?? "—"} checkOut=${s.current.checkOut ?? "—"}`);
    console.log(`  corrected: checkIn=${s.corrected.checkIn ?? "—"} checkOut=${s.corrected.checkOut ?? "—"}`);
  }
  if (mismatchSilent > mismatchSamples.silent.length) console.log(`... and ${mismatchSilent - mismatchSamples.silent.length} more`);

  console.log("\n=== CLEAN mismatches - current record missing a side (first 15) ===");
  for (const s of mismatchSamples.clean) {
    console.log(`${s.employee} (${s.code}, ${s.shift}) - shift day ${s.shiftDate}`);
    console.log(`  current:   checkIn=${s.current.checkIn ?? "—"} checkOut=${s.current.checkOut ?? "—"}`);
    console.log(`  corrected: checkIn=${s.corrected.checkIn ?? "—"} checkOut=${s.corrected.checkOut ?? "—"}`);
  }
  if (mismatchClean > mismatchSamples.clean.length) console.log(`... and ${mismatchClean - mismatchSamples.clean.length} more`);

  console.log("\n=== Summary ===");
  console.log(`Overnight shifts: ${Array.from(overnightShiftNames).join(", ") || "none"}`);
  console.log(`Employees on overnight shifts: ${employees.length}`);
  console.log(`Raw punches scanned: ${transactions.length}`);
  console.log(`Gap-zone punches (reassigned by type - OUT->prev day, IN->this day): ${gapZoneCount}`);
  console.log(`Corrected shift-day buckets computed: ${grouped.size}`);
  console.log(`Already correct: ${matches}`);
  console.log(`No Attendance record at all for this shift-day: ${missing}`);
  console.log(`Mismatch - current record missing a side (matches old "clean split"): ${mismatchClean}`);
  console.log(`Mismatch - current record fully populated but WRONG (silent corruption): ${mismatchSilent}`);
  console.log(`\nTotal shift-days needing correction: ${mismatchClean + mismatchSilent + missing}`);

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
