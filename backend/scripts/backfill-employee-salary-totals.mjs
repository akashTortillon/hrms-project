/**
 * backfill-employee-salary-totals.mjs
 *
 * PURPOSE:
 *   Recomputes `totalSalary` and `ctc` on every existing Employee document using the
 *   corrected formula (see backend/src/utils/salaryCalc.js):
 *     totalSalary = basicSalary + allowance + hra
 *     ctc         = totalSalary + accommodationAllowance + vehicleAllowance
 *   Both fields were previously either manually client-typed (Edit Employee form had no
 *   read-only guard) or computed via an inconsistent/incomplete ad-hoc formula in a few
 *   places (addEmployee, bulk import, probation/appraisal increments). This corrects
 *   every existing record to match the one authoritative formula now used everywhere.
 *
 *   Does NOT touch any other field - only `totalSalary` and `ctc` are recalculated.
 *
 * USAGE:
 *   node scripts/backfill-employee-salary-totals.mjs            # Preview mode (no DB writes)
 *   node scripts/backfill-employee-salary-totals.mjs --apply     # Apply corrections to DB
 *
 * ENVIRONMENT:
 *   Reads DB_URL from .env
 */

import "dotenv/config";
import mongoose from "mongoose";
import Employee from "../src/models/employeeModel.js";
import { computeTotalSalary, computeCtc } from "../src/utils/salaryCalc.js";

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

  const total = await Employee.countDocuments();
  console.log(`Scanning all ${total} employees...\n`);

  const cursor = Employee.find().cursor();

  let scanned = 0;
  let alreadyCorrect = 0;
  let toCorrect = 0;
  let updated = 0;
  let failed = 0;
  const sampleCorrections = [];

  for await (const doc of cursor) {
    scanned++;

    const correctTotalSalary = computeTotalSalary(doc);
    const correctCtc = computeCtc(doc);
    const oldTotalSalary = Number(doc.totalSalary) || 0;
    const oldCtc = Number(doc.ctc) || 0;

    if (oldTotalSalary === correctTotalSalary && oldCtc === correctCtc) {
      alreadyCorrect++;
      continue;
    }

    toCorrect++;
    if (sampleCorrections.length < 10) {
      sampleCorrections.push({
        code: doc.code,
        name: doc.name,
        oldTotalSalary,
        newTotalSalary: correctTotalSalary,
        oldCtc,
        newCtc: correctCtc
      });
    }

    if (MODE === "apply") {
      try {
        await Employee.updateOne(
          { _id: doc._id },
          { $set: { totalSalary: correctTotalSalary, ctc: correctCtc } }
        );
        updated++;
      } catch (err) {
        failed++;
        console.error(`Failed to update ${doc._id}: ${err.message}`);
      }
    }

    if (scanned % 200 === 0) {
      console.log(`Scanned ${scanned}/${total}...`);
    }
  }

  console.log("\nSample corrections (first 10):");
  console.log(JSON.stringify(sampleCorrections, null, 2));

  console.log(`\nSummary:`);
  console.log(`  Scanned:           ${scanned}`);
  console.log(`  Already correct:   ${alreadyCorrect}`);
  console.log(`  Needed correction: ${toCorrect}`);

  if (MODE === "apply") {
    console.log(`  Updated:           ${updated}`);
    console.log(`  Failed:            ${failed}`);
    console.log(`\nDone.`);
  } else {
    console.log(`\nPreview only - no DB writes made.`);
    console.log(`Run with --apply to correct these ${toCorrect} records:`);
    console.log(`    node scripts/backfill-employee-salary-totals.mjs --apply`);
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("\nScript failed:", err.message);
  mongoose.disconnect();
  process.exit(1);
});
