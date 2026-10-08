/**
 * Rewrites each employee's saved shift (and the shift stored on their attendance rows) to the
 * EXACT name of the matching shift in Masters.
 *
 * Why: Employee.shift is the shift master's name. When it differs only in spacing/case from
 * the master ("Flex-Shift -> 1 PM - 4 PM & 7 PM - 4AM" vs "Flex-Shift -> 1 PM-4 PM & 7 PM-4 AM")
 * the employee form shows no shift selected and, in older versions, attendance could not find
 * the shift's hours. The app now matches ignoring spacing/case, but storing the exact name keeps
 * everything (filters, reports, edits) consistent.
 *
 * Employees whose shift matches NO master at all are only listed - pick the right shift for them
 * in the app (or add the missing shift in Masters first).
 *
 * SAFE BY DEFAULT: DRY RUN - prints what would change, writes nothing. Pass --live to apply.
 *
 * Usage:
 *   node src/scripts/fixEmployeeShiftNames.js          # dry run
 *   node src/scripts/fixEmployeeShiftNames.js --live   # apply
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Employee from "../models/employeeModel.js";
import Attendance from "../models/attendanceModel.js";
import Master from "../models/masterModel.js";
import { findShiftByName, parseShiftHoursFromName } from "../utils/shiftName.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const args = process.argv.slice(2);
const LIVE = args.includes("--live");
const uriArg = args.find(a => a.startsWith("--uri="));
const DB_URI = uriArg ? uriArg.split("=")[1] : process.env.DB_URL;

async function main() {
  await mongoose.connect(DB_URI);
  console.log(`Database: ${mongoose.connection.db.databaseName}`);
  console.log(`Mode: ${LIVE ? "LIVE (will write)" : "DRY RUN (no writes)"}`);

  const shifts = await Master.find({ type: "SHIFT" }).lean();
  console.log(`\nShifts in Masters: ${shifts.length}`);
  const noHours = shifts.filter(s => !(s.metadata?.startTime && s.metadata?.endTime));
  if (noHours.length) {
    const unreadable = noHours.filter(s => !parseShiftHoursFromName(s.name));
    console.log(`  ${noHours.length} have no start/end time saved - their hours are read from the name.`);
    if (unreadable.length) console.log(`  WARNING: no hours can be read for: ${unreadable.map(s => s.name).join(" | ")}`);
  }

  // Employees
  const employees = await Employee.find({ shift: { $nin: [null, ""] } }).select("code name shift").lean();
  const toFix = [];
  const unmatched = new Map();
  let alreadyExact = 0;
  for (const e of employees) {
    const match = findShiftByName(shifts, e.shift);
    if (!match) { unmatched.set(e.shift, (unmatched.get(e.shift) || 0) + 1); continue; }
    if (match.name === e.shift) { alreadyExact++; continue; }
    toFix.push({ id: e._id, code: e.code, from: e.shift, to: match.name });
  }
  console.log(`\nEmployees: ${employees.length} with a shift | already exact: ${alreadyExact} | to fix: ${toFix.length} | matching NO shift: ${[...unmatched.values()].reduce((a, b) => a + b, 0)}`);
  toFix.slice(0, 40).forEach(f => console.log(`  ${f.code}: "${f.from}"  ->  "${f.to}"`));
  if (toFix.length > 40) console.log(`  ... and ${toFix.length - 40} more`);
  if (unmatched.size) {
    console.log("\nShift values that match NO shift in Masters (left unchanged):");
    for (const [name, count] of unmatched) console.log(`  ${JSON.stringify(name)}  x${count}`);
  }

  // Attendance rows
  const rowShiftNames = (await Attendance.distinct("shift")).filter(Boolean);
  const rowFixes = [];
  for (const name of rowShiftNames) {
    const match = findShiftByName(shifts, name);
    if (match && match.name !== name) rowFixes.push({ from: name, to: match.name });
  }
  console.log(`\nAttendance rows: ${rowFixes.length} shift spelling(s) to correct`);
  rowFixes.slice(0, 40).forEach(f => console.log(`  "${f.from}"  ->  "${f.to}"`));

  if (LIVE) {
    for (const f of toFix) await Employee.updateOne({ _id: f.id }, { $set: { shift: f.to } });
    for (const f of rowFixes) await Attendance.updateMany({ shift: f.from }, { $set: { shift: f.to } });
    console.log(`\nLIVE MODE - updated ${toFix.length} employee(s) and ${rowFixes.length} attendance shift spelling(s).`);
  } else {
    console.log("\nDRY RUN - nothing changed. Re-run with --live to apply.");
  }
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
