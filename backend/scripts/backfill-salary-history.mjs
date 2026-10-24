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
 *   node scripts/backfill-salary-history.mjs --apply --effective=2026-09-23
 *       # Date the new entries from 2026-09-23 instead of today. Use the START date of the
 *       # unfinalized draft payroll period you are about to regenerate: payroll ignores a
 *       # history entry dated after the period end, so a today-dated entry would not reach
 *       # a period that has already ended. Never earlier than an employee's latest existing
 *       # entry (their joining date, for example), so the entry always wins.
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
import { applyDuePendingSalaryChanges } from "../src/controllers/employeeController.js";

const DB_URL = process.env.DB_URL;
const MODE = process.argv.includes("--apply") ? "apply" : "preview";
const effectiveArg = (process.argv.find((a) => a.startsWith("--effective=")) || "").split("=")[1];
const EFFECTIVE_DATE = effectiveArg ? new Date(`${effectiveArg}T00:00:00Z`) : null;
if (effectiveArg && (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveArg) || Number.isNaN(EFFECTIVE_DATE.getTime()))) {
  console.error("--effective must be YYYY-MM-DD");
  process.exit(1);
}

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
  let pendingDue = 0;
  let updated = 0;
  let failed = 0;
  const samples = [];
  const pendingSamples = [];

  // Latest history entry payroll would pick as of `today` (same ordering as the resolver).
  const latestEntryAsOf = (doc) => {
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);
    return [...(doc.salaryHistory || [])]
      .filter((e) => e.effectiveDate && new Date(e.effectiveDate) <= end)
      .sort((a, b) => (new Date(b.effectiveDate) - new Date(a.effectiveDate)) || (new Date(b.createdAt || 0) - new Date(a.createdAt || 0)))[0];
  };

  for await (const doc of cursor) {
    scanned++;
    let live = toNumber(doc.basicSalary);
    let resolved = resolveEffectiveSalaryAsOf(doc, today).basicSalary;

    if (live === resolved) {
      inSync++;
      continue;
    }

    // A due history entry that was never applied to the live fields (applied:false, date
    // reached - e.g. an approved appraisal increment nobody opened the profile for) is NOT
    // a stale-history case: history is right and live is behind. Apply those (apply mode)
    // or just report them (preview); never overwrite them with the old live value.
    const latest = latestEntryAsOf(doc);
    if (latest && latest.applied === false) {
      pendingDue++;
      if (pendingSamples.length < 100) {
        pendingSamples.push({
          code: doc.code, name: doc.name, liveBasic: live, historyBasic: resolved,
          type: latest.salaryType, effectiveDate: latest.effectiveDate?.toISOString?.().slice(0, 10)
        });
      }
      if (MODE === "apply") {
        try {
          await applyDuePendingSalaryChanges(doc);
          live = toNumber(doc.basicSalary);
          resolved = resolveEffectiveSalaryAsOf(doc, today).basicSalary;
        } catch (err) {
          failed++;
          console.error(`Failed to apply due change for ${doc._id}: ${err.message}`);
          continue;
        }
        if (live === resolved) continue;
      } else {
        continue;
      }
    }

    mismatched++;
    samples.push({
      code: doc.code, name: doc.name, liveBasic: live, payrollBasic: resolved,
      latestEntry: latest ? `${latest.salaryType} ${latest.effectiveDate?.toISOString?.().slice(0, 10)} applied=${latest.applied}` : "none",
      latestBy: latest?.createdByName || ""
    });

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
        // Backdated to --effective when given, but never before the latest existing entry.
        effectiveDate: EFFECTIVE_DATE
          ? new Date(Math.max(EFFECTIVE_DATE.getTime(), latest?.effectiveDate ? new Date(latest.effectiveDate).getTime() : 0))
          : today,
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

  console.log("Due-but-unapplied history entries (history is right, live is behind - fixed by applying them, NOT by backfill):");
  console.log(JSON.stringify(pendingSamples, null, 2));
  console.log("\nStale-history mismatches (live differs from history, history entry already applied):");
  console.log(JSON.stringify(samples, null, 2));
  console.log("\nSummary:");
  console.log(`  Scanned:         ${scanned}`);
  console.log(`  In sync:         ${inSync}`);
  console.log(`  Due, unapplied:  ${pendingDue}`);
  console.log(`  Stale history:   ${mismatched}`);

  if (MODE === "apply") {
    console.log(`  Updated:    ${updated}`);
    console.log(`  Failed:     ${failed}`);
    console.log("\nDone. Regenerate the draft payroll next.");
  } else {
    console.log("\nPreview only - no DB writes made.");
    console.log(`Run with --apply to apply the ${pendingDue} due entries and backfill the ${mismatched} stale-history records:`);
    console.log("    node scripts/backfill-salary-history.mjs --apply");
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("\nScript failed:", err.message);
  mongoose.disconnect();
  process.exit(1);
});
