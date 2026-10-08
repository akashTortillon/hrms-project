/**
 * Explains one employee's attendance: which shift hours the system resolved for them, each raw
 * punch (UAE time) with the shift it was placed in and WHY, what the rebuilt rows would be, and
 * what is stored now. Read-only - never writes.
 *
 * Use it when a row looks wrong (e.g. a check-out showing as the next check-in) and paste the
 * output; it shows exactly which punch went where.
 *
 * Usage:
 *   node src/scripts/explainAttendance.js --badge=T35 --from=2026-10-06 --to=2026-10-08
 *   (badge = the employee's badge number or code; dates are UAE dates, default: last 4 days)
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Employee from "../models/employeeModel.js";
import Attendance from "../models/attendanceModel.js";
import Master from "../models/masterModel.js";
import BiometricTransaction from "../models/biometricTransactionModel.js";
import { getShiftRules, assignPunchesToShiftDays, summarizeShiftDay, uaeDateStr, uaeTimeStr } from "../utils/attendanceUtils.js";
import { findShiftByName } from "../utils/shiftName.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const args = process.argv.slice(2);
const valueOf = (name) => {
  const arg = args.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.slice(name.length + 3).trim() : null;
};
const BADGE = valueOf("badge");
const DB_URI = valueOf("uri") || process.env.DB_URL;

const addDays = (dateStr, n) => {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split("T")[0];
};

async function main() {
  if (!BADGE) {
    console.error("Usage: node src/scripts/explainAttendance.js --badge=T35 [--from=YYYY-MM-DD] [--to=YYYY-MM-DD]");
    process.exit(1);
  }
  const to = valueOf("to") || uaeDateStr(new Date());
  const from = valueOf("from") || addDays(to, -3);

  await mongoose.connect(DB_URI);
  console.log(`Database: ${mongoose.connection.db.databaseName}   (read-only)`);

  const employee = await Employee.findOne({ $or: [{ badgeNumber: BADGE }, { code: BADGE }] });
  if (!employee) {
    console.log(`No employee with badge/code "${BADGE}".`);
    await mongoose.disconnect();
    return;
  }
  const badge = (employee.badgeNumber || employee.code || "").trim();
  console.log(`\nEmployee: ${employee.name} (${employee.code})   badge: ${badge}`);
  console.log(`Saved shift: ${JSON.stringify(employee.shift)}`);

  // Which shift master that resolves to, and where its hours come from
  const shifts = await Master.find({ type: "SHIFT" }).lean();
  const master = findShiftByName(shifts, employee.shift);
  if (!master) {
    console.log("Shift master: NONE MATCHES -> treated as a plain calendar day (00:00-00:00), never late.");
  } else {
    const saved = master.metadata?.startTime && master.metadata?.endTime;
    console.log(`Shift master: ${JSON.stringify(master.name)}${master.name === employee.shift ? "" : "  (matched ignoring spacing/case)"}`);
    console.log(`Saved hours on the master: ${saved ? `${master.metadata.startTime}-${master.metadata.endTime}` : "none (read from the name)"}`);
  }
  const rules = await getShiftRules(employee.shift || "Day Shift");
  console.log(`Hours used: ${rules.start} -> ${rules.end}${rules.end <= rules.start ? " (next day)" : ""}   late tiers: ${rules.buffers.length ? rules.buffers.join(", ") : "none"}`);

  // Punches: a few days of slack either side so every shift touching the range is complete
  const punches = await BiometricTransaction.find({
    badgeNumber: badge,
    timestamp: {
      $gte: new Date(`${addDays(from, -3)}T00:00:00+04:00`),
      $lt: new Date(`${addDays(to, 3)}T00:00:00+04:00`)
    }
  }).select("timestamp").sort({ timestamp: 1 }).lean();

  const trace = [];
  const buckets = assignPunchesToShiftDays(punches, rules, trace);

  console.log(`\nPunches (UAE time) and where each one goes:`);
  for (const t of trace) {
    const day = uaeDateStr(t.timestamp);
    if (day < from || day > to) continue;
    console.log(`  ${day} ${uaeTimeStr(t.timestamp)}  ->  ${t.bucket ?? "(ignored)"}   ${t.reason}`);
  }

  console.log(`\nRebuilt rows (what a rebuild gives):`);
  const stored = await Attendance.find({ employee: employee._id, date: { $gte: from, $lte: to } }).sort({ date: 1 }).lean();
  const storedByDate = new Map(stored.map((r) => [r.date, r]));
  for (const date of [...buckets.keys()].sort()) {
    if (date < from || date > to) continue;
    const s = summarizeShiftDay(date, buckets.get(date), rules);
    console.log(`  ${date}  in ${s.checkIn ?? "-"}  out ${s.checkOut ?? "-"}${s.checkOutNextDay ? " (next day)" : ""}  work ${s.workHours ?? "-"}  punches ${buckets.get(date).length}${s.missingCheckIn ? "  <- no check-in scan, only the check-out" : ""}`);
  }

  console.log(`\nStored now:`);
  if (!stored.length) console.log("  (no rows)");
  for (const r of stored) {
    console.log(`  ${r.date}  in ${r.checkIn ?? "-"}  out ${r.checkOut ?? "-"}${r.checkOutNextDay ? " (next day)" : ""}  work ${r.workHours ?? "-"}  ${r.status}  shift ${JSON.stringify(r.shift)}${r.isManuallyEdited ? "  [manually edited]" : ""}`);
  }
  const rebuilt = new Set([...buckets.keys()].filter((d) => d >= from && d <= to));
  const orphans = stored.filter((r) => !rebuilt.has(r.date) && r.checkIn);
  if (orphans.length) console.log(`\nRows stored but NOT in the rebuild (leftovers of older, wrong grouping): ${orphans.map((r) => r.date).join(", ")}`);

  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
