/**
 * Deletes Attendance rows so they can be rebuilt from the raw punches. Employees, Masters,
 * Users, payroll and everything else are untouched.
 *
 * The raw BiometricTransaction records (the punches) and the sync cursor are deliberately
 * KEPT - they are the ground truth. After clearing, rebuild the rows with:
 *   node src/scripts/backfillAttendanceFromBiometric.js --live
 *
 * SAFE BY DEFAULT: runs in DRY RUN - prints what would be deleted, deletes nothing.
 * Pass --live to actually delete.
 *
 * Usage:
 *   node src/scripts/clearAttendance.js                              # dry run, all attendance
 *   node src/scripts/clearAttendance.js --live                       # delete ALL attendance rows
 *   node src/scripts/clearAttendance.js --live --from=2026-09-29 --to=2026-10-02
 *   node src/scripts/clearAttendance.js --live --keep-manual         # keep manually edited + "On Leave" rows
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Attendance from "../models/attendanceModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const args = process.argv.slice(2);
const LIVE = args.includes("--live");
const KEEP_MANUAL = args.includes("--keep-manual");
const fromArg = args.find(a => a.startsWith("--from="));
const toArg = args.find(a => a.startsWith("--to="));
const uriArg = args.find(a => a.startsWith("--uri="));
const FROM_DATE = fromArg ? fromArg.split("=")[1] : null; // "YYYY-MM-DD", inclusive
const TO_DATE = toArg ? toArg.split("=")[1] : null;       // "YYYY-MM-DD", inclusive
const DB_URI = uriArg ? uriArg.split("=")[1] : process.env.DB_URL; // --uri= overrides .env DB_URL

async function main() {
  await mongoose.connect(DB_URI);
  console.log(`Connected to: ${DB_URI}`);
  console.log(`Database: ${mongoose.connection.db.databaseName}`);
  console.log(`Mode: ${LIVE ? "LIVE (will delete)" : "DRY RUN (no writes)"}`);
  console.log(`Date range: ${FROM_DATE || TO_DATE ? `${FROM_DATE || "start"} to ${TO_DATE || "end"}` : "ALL dates"}`);
  console.log(`Manually edited / On Leave rows: ${KEEP_MANUAL ? "kept" : "DELETED too"}`);

  const filter = {};
  if (FROM_DATE || TO_DATE) {
    filter.date = {};
    if (FROM_DATE) filter.date.$gte = FROM_DATE;
    if (TO_DATE) filter.date.$lte = TO_DATE;
  }
  if (KEEP_MANUAL) {
    filter.isManuallyEdited = { $ne: true };
    filter.status = { $ne: "On Leave" };
  }

  const total = await Attendance.countDocuments(filter);
  const byStatus = await Attendance.aggregate([
    { $match: filter },
    { $group: { _id: "$status", count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  const manual = await Attendance.countDocuments({ ...filter, isManuallyEdited: true });
  const onLeave = await Attendance.countDocuments({ ...filter, status: "On Leave" });

  console.log(`\nAttendance rows ${LIVE ? "to delete" : "that would be deleted"}: ${total}`);
  for (const s of byStatus) console.log(`  ${s._id || "(no status)"}: ${s.count}`);
  if (!KEEP_MANUAL) {
    console.log(`  of which manually edited: ${manual}, On Leave: ${onLeave}`);
  }

  if (LIVE && total > 0) {
    const res = await Attendance.deleteMany(filter);
    console.log(`\nLIVE MODE - deleted ${res.deletedCount} attendance row(s).`);
    console.log("Raw punches were NOT touched. Rebuild with:");
    console.log("  node src/scripts/backfillAttendanceFromBiometric.js --live");
  } else if (!LIVE) {
    console.log("\nDRY RUN - nothing deleted. Re-run with --live to apply.");
  }

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
