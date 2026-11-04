/**
 * Deletes every UNFINALIZED payroll record (status "DRAFT") so a stale draft can no longer
 * block generating a new period ("overlaps an existing DRAFT payroll period ...").
 *
 * Finalized payroll is never touched: only status "DRAFT" is matched. PROCESSED (finalized
 * and locked) and PAID records are left alone, same as the in-app delete/force-generate
 * paths, which also remove DRAFT rows only.
 *
 * SAFE BY DEFAULT: runs in DRY RUN - lists what would be deleted, writes nothing.
 * Pass --live to actually delete.
 *
 * Usage:
 *   node src/scripts/clearDraftPayrolls.js                     # dry run, all drafts
 *   node src/scripts/clearDraftPayrolls.js --live              # delete all drafts
 *   node src/scripts/clearDraftPayrolls.js --live --from=2026-09-01 --to=2026-10-31
 *       (only drafts whose period overlaps that range, dates inclusive, YYYY-MM-DD)
 *   node src/scripts/clearDraftPayrolls.js --uri=mongodb://...  # override .env DB_URL
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Payroll from "../models/payrollModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const args = process.argv.slice(2);
const LIVE = args.includes("--live");
const argValue = (name) => {
  const a = args.find(x => x.startsWith(`--${name}=`));
  return a ? a.slice(name.length + 3) : null;
};
const FROM_DATE = argValue("from");
const TO_DATE = argValue("to");
const DB_URI = argValue("uri") || process.env.DB_URL;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ymd = (d) => new Date(d).toISOString().split("T")[0];

async function main() {
  for (const [name, v] of [["from", FROM_DATE], ["to", TO_DATE]]) {
    if (v && !DATE_RE.test(v)) throw new Error(`--${name} must be YYYY-MM-DD, got "${v}"`);
  }
  if (!DB_URI) throw new Error("No DB URL: set DB_URL in backend/.env or pass --uri=");

  await mongoose.connect(DB_URI);
  console.log(`Connected to: ${DB_URI}`);
  console.log(`Mode: ${LIVE ? "LIVE (will delete)" : "DRY RUN (no writes)"}`);
  if (FROM_DATE || TO_DATE) console.log(`Range: ${FROM_DATE || "start"} to ${TO_DATE || "end"} (overlap)`);

  const filter = { status: "DRAFT" };
  if (FROM_DATE) filter.periodEnd = { $gte: new Date(`${FROM_DATE}T00:00:00.000Z`) };
  if (TO_DATE) filter.periodStart = { $lte: new Date(`${TO_DATE}T23:59:59.999Z`) };

  const periods = await Payroll.aggregate([
    { $match: filter },
    { $group: { _id: { s: "$periodStart", e: "$periodEnd" }, records: { $sum: 1 } } },
    { $sort: { "_id.s": 1 } }
  ]);
  const total = periods.reduce((n, p) => n + p.records, 0);

  console.log("\n=== DRAFT payroll periods ===");
  if (!periods.length) console.log("(none)");
  for (const p of periods) {
    console.log(`${ymd(p._id.s)} to ${ymd(p._id.e)}: ${p.records} record(s)`);
  }

  const kept = await Payroll.countDocuments({ status: { $in: ["PROCESSED", "PAID"] } });
  console.log(`\nDrafts matched: ${total} record(s) in ${periods.length} period(s)`);
  console.log(`Finalized (PROCESSED/PAID) records - never touched: ${kept}`);

  if (!LIVE) {
    console.log("\nDRY RUN - nothing deleted. Re-run with --live to apply.");
  } else if (total > 0) {
    // status re-checked in the delete filter so a record finalized mid-run is never removed
    const res = await Payroll.deleteMany(filter);
    console.log(`\nLIVE MODE - deleted ${res.deletedCount} draft record(s).`);
  } else {
    console.log("\nLIVE MODE - nothing to delete.");
  }

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
