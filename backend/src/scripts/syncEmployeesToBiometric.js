/**
 * Pushes HRMS employees into BioCloud (api_saveemployee, then the configured area/devices) -
 * for employees that existed before auto-sync, or whose automatic push failed.
 *
 * By default only employees NOT already marked SYNCED are sent (never synced, FAILED or
 * SKIPPED). Pass --all to re-send everyone; BioCloud treats api_saveemployee as an upsert by
 * BadgeNumber, so re-sending is safe.
 *
 * SAFE BY DEFAULT: DRY RUN - lists who would be sent, calls nothing. Pass --live to send.
 *
 * Needs BIOCLOUD_API_URL + BIOCLOUD_API_TOKEN in .env; set BIOCLOUD_DEFAULT_AREA and/or
 * BIOCLOUD_DEVICE_SERIALS (comma separated) to also queue employees onto devices.
 *
 * Usage:
 *   node src/scripts/syncEmployeesToBiometric.js                 # dry run
 *   node src/scripts/syncEmployeesToBiometric.js --live          # send the ones not yet SYNCED
 *   node src/scripts/syncEmployeesToBiometric.js --live --all    # re-send every employee
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Employee from "../models/employeeModel.js";
import { syncEmployeeToBiometric, getBadgeNumber } from "../services/bioCloudEmployeeService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const args = process.argv.slice(2);
const LIVE = args.includes("--live");
const ALL = args.includes("--all");
const uriArg = args.find(a => a.startsWith("--uri="));
const DB_URI = uriArg ? uriArg.split("=")[1] : process.env.DB_URL; // --uri= overrides .env DB_URL

async function main() {
  await mongoose.connect(DB_URI);
  console.log(`Connected to: ${DB_URI}`);
  console.log(`Mode: ${LIVE ? "LIVE (will call BioCloud)" : "DRY RUN (no calls)"}`);
  console.log(`BioCloud: ${process.env.BIOCLOUD_API_URL || "(BIOCLOUD_API_URL not set)"}`);
  console.log(`Push to area: ${process.env.BIOCLOUD_DEFAULT_AREA || "(none)"} | devices: ${process.env.BIOCLOUD_DEVICE_SERIALS || "(none)"}`);

  const filter = ALL ? {} : { "biometricSync.status": { $ne: "SYNCED" } };
  const employees = await Employee.find(filter).sort({ code: 1 }).lean();
  console.log(`\nEmployees ${LIVE ? "to send" : "that would be sent"}: ${employees.length}${ALL ? " (all)" : " (not yet SYNCED)"}`);

  const summary = { SYNCED: 0, FAILED: 0, SKIPPED: 0 };
  const noBadge = [];
  for (const emp of employees) {
    const badge = getBadgeNumber(emp);
    if (!badge) { noBadge.push(emp.name); continue; }

    if (!LIVE) {
      console.log(`  ${badge}  ${emp.name}  (last: ${emp.biometricSync?.status || "never"})`);
      continue;
    }
    const result = await syncEmployeeToBiometric(emp);
    summary[result.status] = (summary[result.status] || 0) + 1;
  }

  if (noBadge.length) console.log(`\nNo badge number or code (skipped): ${noBadge.join(", ")}`);
  if (LIVE) {
    console.log(`\nDone - synced ${summary.SYNCED}, failed ${summary.FAILED}, skipped ${summary.SKIPPED}.`);
    if (summary.FAILED) console.log("Failure reasons are stored on each employee: db.employees.find({'biometricSync.status':'FAILED'},{code:1,'biometricSync.message':1})");
  } else {
    console.log("\nDRY RUN - nothing sent. Re-run with --live to apply.");
  }

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
