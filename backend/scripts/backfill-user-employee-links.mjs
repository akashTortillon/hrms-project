/**
 * backfill-user-employee-links.mjs
 *
 * PURPOSE:
 *   Links every existing `User` account that has no `employeeId` set to its
 *   matching `Employee` record by email. This gap happens for anyone onboarded
 *   via bulk Excel import (`importEmployees`), which creates Employee records
 *   but never creates/links a User account - unlike the single "Add Employee"
 *   form, which sets `employeeId` on the new User at creation time.
 *
 *   An unlinked User account causes request-routing lookups (resolveManagerRecipient /
 *   resolveFinanceRecipient in requestController.js) to silently fail to find that
 *   person, even though the Employee-side `designatedManager`/`designatedFinanceManager`
 *   assignment is completely correct - e.g. a leave request meant for a bulk-imported
 *   Manager falls through straight to HR instead. Logging in once self-heals a User's
 *   own `employeeId` (authMiddleware.js), but does nothing for requests routing TO them
 *   from other employees - this script closes that gap for everyone in one pass instead
 *   of waiting on each affected person to log in.
 *
 *   Does NOT touch any User that already has `employeeId` set, and does NOT create or
 *   modify any Employee record - only the `employeeId` field on already-existing, still-
 *   unlinked User documents is written.
 *
 * USAGE:
 *   node scripts/backfill-user-employee-links.mjs            # Preview mode (no DB writes)
 *   node scripts/backfill-user-employee-links.mjs --apply     # Apply the links to DB
 *
 * ENVIRONMENT:
 *   Reads DB_URL from .env
 */

import "dotenv/config";
import mongoose from "mongoose";
import User from "../src/models/userModel.js";
import Employee from "../src/models/employeeModel.js";

const DB_URL = process.env.DB_URL;
const MODE = process.argv.includes("--apply") ? "apply" : "preview";

const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function run() {
  if (!DB_URL) {
    console.error("DB_URL is not set in .env");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(DB_URL);
  console.log(`Connected: ${mongoose.connection.host} / ${mongoose.connection.name}\n`);
  console.log(`Mode: ${MODE.toUpperCase()}\n`);

  const unlinkedUsers = await User.find({
    $or: [{ employeeId: { $exists: false } }, { employeeId: null }]
  }).select("_id name email role employeeId");

  console.log(`Found ${unlinkedUsers.length} User account(s) with no employeeId linked.\n`);

  let matched = 0;
  let noEmail = 0;
  let noMatch = 0;
  let ambiguous = 0;
  const matches = [];

  for (const user of unlinkedUsers) {
    if (!user.email) {
      noEmail++;
      console.log(`  SKIP  ${user.name || user._id} - no email on User record`);
      continue;
    }

    const candidates = await Employee.find({
      email: { $regex: new RegExp(`^${escapeRegex(user.email)}$`, "i") }
    }).select("_id name email code");

    if (candidates.length === 0) {
      noMatch++;
      console.log(`  MISS  ${user.name || user._id} <${user.email}> - no Employee found with this email`);
      continue;
    }

    if (candidates.length > 1) {
      ambiguous++;
      console.log(`  SKIP  ${user.name || user._id} <${user.email}> - ${candidates.length} Employee records share this email, needs manual review`);
      continue;
    }

    const employee = candidates[0];
    matched++;
    matches.push({ user, employee });
    console.log(`  LINK  ${user.name || user._id} <${user.email}> -> Employee ${employee.code || employee._id} (${employee.name})`);
  }

  console.log(`\nSummary: ${matched} to link, ${noMatch} no match, ${ambiguous} ambiguous, ${noEmail} no email, ${unlinkedUsers.length - matched - noMatch - ambiguous - noEmail} other.\n`);

  if (MODE === "apply" && matched > 0) {
    console.log("Applying links...");
    for (const { user, employee } of matches) {
      await User.updateOne({ _id: user._id }, { $set: { employeeId: employee._id } });
    }
    console.log(`Linked ${matched} User account(s).`);
  } else if (MODE === "preview" && matched > 0) {
    console.log("Preview only - re-run with --apply to write these links.");
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
