/**
 * Lists every shift in Masters whose SAVED start/end hours disagree with the hours written in
 * the shift's own name, and (with --live) corrects the saved hours to match the name.
 *
 * Why: a typo such as "Shift -> 4 AM-4 PM" saved as 03:00-05:00 (5 PM typed as 05:00) gives
 * the shift a 2-hour window, and attendance then pairs punches the wrong way round. The app now
 * ignores saved hours that differ from the name by more than 2 hours, but fixing the data makes
 * the Masters page show the right hours too. A difference of up to 2 hours (e.g. 1 hour of
 * grace either side) is considered deliberate and left alone.
 *
 * SAFE BY DEFAULT: DRY RUN - prints what would change, writes nothing. Pass --live to apply.
 * Only startTime/endTime are touched; late tiers and everything else on the shift are kept.
 *
 * Usage:
 *   node src/scripts/fixShiftHours.js          # dry run
 *   node src/scripts/fixShiftHours.js --live   # apply
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Master from "../models/masterModel.js";
import Employee from "../models/employeeModel.js";
import { parseShiftHoursFromName, shiftKey } from "../utils/shiftName.js";
import { toMinutes } from "../utils/attendanceUtils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const args = process.argv.slice(2);
const LIVE = args.includes("--live");
const uriArg = args.find(a => a.startsWith("--uri="));
const DB_URI = uriArg ? uriArg.split("=")[1] : process.env.DB_URL;

const apart = (a, b) => { const d = Math.abs(toMinutes(a) - toMinutes(b)); return Math.min(d, 24 * 60 - d); };

async function main() {
  await mongoose.connect(DB_URI);
  console.log(`Database: ${mongoose.connection.db.databaseName}`);
  console.log(`Mode: ${LIVE ? "LIVE (will write)" : "DRY RUN (no writes)"}`);

  const shifts = await Master.find({ type: "SHIFT" });
  const employees = await Employee.find({ shift: { $nin: [null, ""] } }).select("shift").lean();
  const users = (name) => employees.filter(e => shiftKey(e.shift) === shiftKey(name)).length;

  const toFix = [];
  const noHours = [];
  const unreadable = [];
  for (const m of shifts) {
    const fromName = parseShiftHoursFromName(m.name);
    const start = m.metadata?.startTime;
    const end = m.metadata?.endTime;
    if (!fromName) { unreadable.push(m); continue; }
    if (!start || !end) { noHours.push({ m, fromName }); continue; }
    if (apart(start, fromName.start) > 120 || apart(end, fromName.end) > 120) toFix.push({ m, saved: `${start}-${end}`, fromName });
  }

  console.log(`\nShifts: ${shifts.length}`);
  console.log(`Saved hours DISAGREE with the name (more than 2h): ${toFix.length}`);
  for (const f of toFix) {
    console.log(`  ${JSON.stringify(f.m.name)}  saved ${f.saved}  ->  name says ${f.fromName.start}-${f.fromName.end}   (${users(f.m.name)} employee(s))`);
  }
  console.log(`No saved hours (hours are read from the name): ${noHours.length}`);
  if (unreadable.length) console.log(`No hours in the name and none saved: ${unreadable.map(m => JSON.stringify(m.name)).join(", ")}`);

  if (LIVE) {
    for (const f of toFix) {
      f.m.metadata = { ...(f.m.metadata || {}), startTime: f.fromName.start, endTime: f.fromName.end };
      f.m.markModified("metadata");
      await f.m.save();
    }
    console.log(`\nLIVE MODE - corrected ${toFix.length} shift(s).`);
  } else {
    console.log("\nDRY RUN - nothing changed. Re-run with --live to correct them.");
  }
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
