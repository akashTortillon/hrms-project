/**
 * backfill-salary-history.mjs
 *
 * PURPOSE:
 *   Payroll takes basic salary from the latest `salaryHistory` entry effective on or before
 *   the period end, not from the live `employee.basicSalary`. Before the fix, editing an
 *   employee's salary (Employees > Edit) rewrote the live fields only, so employees whose
 *   history still held the Excel-import JOINING entry kept being paid the old basic.
 *
 *   For every employee whose live basic differs from what payroll would resolve today, this
 *   appends a MANUAL_ADJUSTMENT history entry (effective today) carrying the live values, so
 *   payroll and the Salary tab agree again. Nothing else is modified.
 *
 * USAGE:
 *   node scripts/backfill-salary-history.mjs            # Preview mode (no DB writes)
 *   node scripts/backfill-salary-history.mjs --apply     # Append the missing entries
 *
 *   After applying, Regenerate the draft payroll (payroll rows are snapshots).
 *
 * ENVIRONMENT:
 *   Reads DB_URL from .env
 */

import "dotenv/config";
import mongoose from "mongoose";
import Employee from "../src/models/employeeModel.js";
import { resolveEffectiveSalaryAsOf, toNumber } from "../src/utils/salaryUtils.js";

const DB_URL = process.env.DB_URL;
const MODE = process.argv.includes("--apply") ? "apply" : "preview";

async function run() {
  if (!DB_URL) {
    console.error("DB_URL is not set in .env");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(DB_URL);
  console.log(`Connected: ${mongoose.connection.host} / ${mongoose.connection.name}\n`);

  const today = new Date();
  const cursor = Employee.find().cursor();

  let scanned = 0;
  let inSync = 0;
  let mismatched = 0;
  let updated = 0;
  let failed = 0;
  const samples = [];

  for await (const doc of cursor) {
    scanned++;
    const live = toNumber(doc.basicSalary);
    const resolved = resolveEffectiveSalaryAsOf(doc, today).basicSalary;

    if (live === resolved) {
      inSync++;
      continue;
    }

    mismatched++;
    if (samples.length < 20) {
      samples.push({ code: doc.code, name: doc.name, liveBasic: live, payrollBasic: resolved });
    }

    if (MODE !== "apply") continue;

    try {
      const entry = {
        salaryType: "MANUAL_ADJUSTMENT",
        basicSalary: live,
        visaBase: toNumber(doc.visaBase || doc.basicSalary),
        workBase: toNumber(doc.workBase || doc.basicSalary),
        allowance: toNumber(doc.allowance),
        hra: toNumber(doc.hra),
        ctc: toNumber(doc.ctc),
        effectiveDate: today,
        notes: "Backfill: live salary differed from salary history",
        createdByName: "System (backfill)",
        applied: true,
        changes: [{ field: "basicSalary", from: resolved, to: live }]
      };
      await Employee.updateOne({ _id: doc._id }, { $push: { salaryHistory: entry } });
      updated++;
    } catch (err) {
      failed++;
      console.error(`Failed to update ${doc._id}: ${err.message}`);
    }
  }

  console.log("Mismatches (first 20):");
  console.log(JSON.stringify(samples, null, 2));
  console.log("\nSummary:");
  console.log(`  Scanned:    ${scanned}`);
  console.log(`  In sync:    ${inSync}`);
  console.log(`  Mismatched: ${mismatched}`);

  if (MODE === "apply") {
    console.log(`  Updated:    ${updated}`);
    console.log(`  Failed:     ${failed}`);
    console.log("\nDone. Regenerate the draft payroll next.");
  } else {
    console.log("\nPreview only - no DB writes made.");
    console.log(`Run with --apply to fix these ${mismatched} records:`);
    console.log("    node scripts/backfill-salary-history.mjs --apply");
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("\nScript failed:", err.message);
  mongoose.disconnect();
  process.exit(1);
});
