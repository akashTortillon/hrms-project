/**
 * check-incomplete-attendance-scope.mjs
 *
 * READ-ONLY. Reports how many Attendance records qualify for the new "Incomplete"
 * status (checkIn set, checkOut missing, on a day that's already over) and what
 * they're currently mislabeled as, so you can see the scope before running the
 * actual fix.
 *
 * The actual fix is just: `node scripts/reprocess-attendance.mjs` (existing script,
 * already safe/idempotent) once the Incomplete-status code is deployed - it recomputes
 * every record's status from its transactions and will correctly relabel these.
 *
 * USAGE:
 *   node scripts/check-incomplete-attendance-scope.mjs
 *
 * ENVIRONMENT:
 *   Reads DB_URL from .env
 */

import "dotenv/config";
import mongoose from "mongoose";
import Attendance from "../src/models/attendanceModel.js";
import "../src/models/employeeModel.js";

const DB_URL = process.env.DB_URL;

const getUaeTodayDateStr = () => {
  const uaeNow = new Date(Date.now() + 4 * 60 * 60 * 1000);
  return uaeNow.toISOString().split("T")[0];
};

async function run() {
  if (!DB_URL) {
    console.error("DB_URL is not set in .env");
    process.exit(1);
  }

  await mongoose.connect(DB_URL);
  console.log(`Connected: ${mongoose.connection.host} / ${mongoose.connection.name}\n`);

  const today = getUaeTodayDateStr();

  const query = {
    checkIn: { $ne: null },
    $or: [{ checkOut: null }, { checkOut: { $exists: false } }],
    date: { $lt: today },
    isManuallyEdited: { $ne: true }
  };

  const total = await Attendance.countDocuments(query);
  console.log(`Records qualifying for "Incomplete" (checkIn set, no checkOut, date < ${today}, not manually edited): ${total}\n`);

  const byCurrentStatus = await Attendance.aggregate([
    { $match: query },
    { $group: { _id: "$status", count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  console.log("Currently mislabeled as:");
  for (const row of byCurrentStatus) {
    console.log(`  ${row._id}: ${row.count}`);
  }

  const manuallyEditedCount = await Attendance.countDocuments({
    checkIn: { $ne: null },
    $or: [{ checkOut: null }, { checkOut: { $exists: false } }],
    date: { $lt: today },
    isManuallyEdited: true
  });
  console.log(`\nAlso found ${manuallyEditedCount} similar record(s) that were manually edited by HR - these are left alone by reprocess-attendance.mjs (respects isManuallyEdited), listed here for awareness only, not touched automatically.`);

  const sample = await Attendance.find(query).limit(10).populate("employee", "name code").lean();
  console.log("\nSample (first 10):");
  for (const r of sample) {
    console.log(`  ${r.employee?.name || r.employee} (${r.employee?.code || "?"}) - ${r.date} - checkIn=${r.checkIn} status=${r.status}`);
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
