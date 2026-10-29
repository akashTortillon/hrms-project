/**
 * seed-qa-leave-wallets.mjs
 *
 * PURPOSE:
 *   QA Test Employee A/B (created by create-qa-test-users.mjs) start with no
 *   LeaveWallet docs at all, so any leave request they submit fails the
 *   self-service balance check in createRequest ("Insufficient leave balance") -
 *   not a bug, just missing test-data setup (real employees get their wallet via
 *   normal onboarding/monthly accrual, which these script-created accounts never
 *   went through). This gives both QA test employees a working balance for every
 *   active LEAVE_TYPE Master, so item 2 (sick leave + medical doc) and other leave
 *   flows can actually be submitted and tested.
 *
 * USAGE:
 *   node scripts/seed-qa-leave-wallets.mjs            # Preview mode (no DB writes)
 *   node scripts/seed-qa-leave-wallets.mjs --apply     # Actually seed the wallets
 *
 * ENVIRONMENT:
 *   Reads MONGO_URI (or DB_URL) from .env
 */

import "dotenv/config";
import mongoose from "mongoose";
import Employee from "../src/models/employeeModel.js";
import Master from "../src/models/masterModel.js";
import LeaveWallet from "../src/models/leaveWalletModel.js";

const DB_URL = process.env.MONGO_URI || process.env.DB_URL;
const MODE = process.argv.includes("--apply") ? "apply" : "preview";
const BALANCE_DAYS = 20;

async function run() {
  if (!DB_URL) {
    console.error("MONGO_URI / DB_URL is not set in .env");
    process.exit(1);
  }

  await mongoose.connect(DB_URL);
  console.log(`Connected: ${mongoose.connection.host} / ${mongoose.connection.name}`);
  console.log(`Mode: ${MODE.toUpperCase()}\n`);

  const employees = await Employee.find({ code: { $in: ["QA-EMP-A", "QA-EMP-B"] } });
  const leaveTypes = await Master.find({ type: "LEAVE_TYPE" });

  console.log(`Found ${employees.length} QA test employee(s), ${leaveTypes.length} leave type(s).\n`);

  for (const emp of employees) {
    for (const lt of leaveTypes) {
      const existing = await LeaveWallet.findOne({ employee: emp._id, leaveType: lt._id });
      if (existing) {
        console.log(`SKIP  ${emp.code} / ${lt.name} - wallet already exists (balance: ${existing.balanceDays}).`);
        continue;
      }
      if (MODE === "apply") {
        await LeaveWallet.create({ employee: emp._id, leaveType: lt._id, balanceDays: BALANCE_DAYS });
        console.log(`CREATED ${emp.code} / ${lt.name} - balance ${BALANCE_DAYS} days.`);
      } else {
        console.log(`[preview] Would create ${emp.code} / ${lt.name} - balance ${BALANCE_DAYS} days.`);
      }
    }
  }

  if (MODE === "preview") console.log("\nRun again with --apply to actually seed these wallets.");
  await mongoose.disconnect();
}

run().catch((err) => { console.error(err); process.exit(1); });
