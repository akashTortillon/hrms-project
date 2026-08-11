/**
 * diagnose-fix-manager-employee-link.mjs
 *
 * PURPOSE:
 *   Root cause of "Manager sees No employees found despite having assigned direct
 *   reports": a Manager's User.employeeId only auto-heals (authMiddleware.js) when
 *   their login email case-insensitively matches an Employee record's email. If it
 *   doesn't - self-registered account, Employee email edited later without updating
 *   the login email, etc. - employeeId never resolves, and the manager-scope query
 *   in getEmployees() collapses to nothing.
 *
 *   This script finds every Manager-role User with no employeeId link, and where
 *   possible, applies the fix directly.
 *
 * USAGE:
 *   node scripts/diagnose-fix-manager-employee-link.mjs
 *       Scans every User whose role is "Manager" (or has APPROVE_MANAGER_REQUESTS
 *       permission via their role master) and reports which ones have no
 *       employeeId, plus a best-guess Employee match by name (does NOT write
 *       anything - this is always safe to run).
 *
 *   node scripts/diagnose-fix-manager-employee-link.mjs --fix <userEmail> <employeeCode>
 *       Links that specific User to that specific Employee (sets User.employeeId).
 *       Use this once you've confirmed which Employee record a broken manager
 *       account should point to, from the scan output above (or from what you
 *       already know from the deployment).
 *
 * ENVIRONMENT:
 *   Reads DB_URL from .env - POINT THIS AT PROD BY RUNNING FROM AN ENVIRONMENT WHOSE
 *   .env / DB_URL is actually your production database. This repo's local .env is the
 *   dev/staging DB used for testing this session - it will NOT show your real manager.
 */

import "dotenv/config";
import mongoose from "mongoose";

const DB_URL = process.env.DB_URL;
const args = process.argv.slice(2);
const fixIndex = args.indexOf("--fix");

async function run() {
  if (!DB_URL) {
    console.error("DB_URL is not set in .env");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(DB_URL);
  console.log(`Connected: ${mongoose.connection.host} / ${mongoose.connection.name}\n`);

  const users = mongoose.connection.collection("users");
  const employees = mongoose.connection.collection("employees");
  const masters = mongoose.connection.collection("masters");

  if (fixIndex !== -1) {
    const userEmail = args[fixIndex + 1];
    const employeeCode = args[fixIndex + 2];
    if (!userEmail || !employeeCode) {
      console.error("Usage: node scripts/diagnose-fix-manager-employee-link.mjs --fix <userEmail> <employeeCode>");
      process.exit(1);
    }

    const user = await users.findOne({ email: new RegExp(`^${userEmail}$`, "i") });
    if (!user) { console.error(`No User found with email ${userEmail}`); process.exit(1); }

    const employee = await employees.findOne({ code: employeeCode });
    if (!employee) { console.error(`No Employee found with code ${employeeCode}`); process.exit(1); }

    await users.updateOne({ _id: user._id }, { $set: { employeeId: employee._id } });
    console.log(`Linked User ${user.email} -> Employee ${employee.code} (${employee.name}).`);
    console.log("The manager should now see their assigned reports without needing to do anything else.");
    await mongoose.disconnect();
    return;
  }

  // --- Scan mode ---
  const managerRoleDocs = await masters.find({
    type: "ROLE",
    $or: [{ name: /manager/i }, { permissions: "APPROVE_MANAGER_REQUESTS" }]
  }).toArray();
  const managerRoleNames = managerRoleDocs.map(r => r.name);
  console.log(`Manager-ish roles found: ${managerRoleNames.join(", ") || "(none)"}\n`);

  const managerUsers = await users.find({
    $or: [
      { role: { $in: managerRoleNames } },
      { role: /manager/i }
    ]
  }).toArray();

  console.log(`Found ${managerUsers.length} user(s) in a manager-ish role.\n`);

  let broken = 0;
  for (const user of managerUsers) {
    const hasLink = !!user.employeeId;
    let linkedEmployeeExists = false;
    if (hasLink) {
      linkedEmployeeExists = !!(await employees.findOne({ _id: user.employeeId }));
    }

    if (!hasLink || !linkedEmployeeExists) {
      broken++;
      console.log(`BROKEN: ${user.email} (role: ${user.role}) - employeeId ${hasLink ? "points to a deleted/missing Employee" : "is not set"}.`);

      // Best-guess match: same email (case-insensitive), or same name.
      const byEmail = await employees.findOne({ email: new RegExp(`^${user.email}$`, "i") });
      const byName = user.name ? await employees.find({ name: new RegExp(user.name, "i") }).toArray() : [];

      if (byEmail) {
        console.log(`  -> Likely match by email: Employee ${byEmail.code} (${byEmail.name}). Fix with:`);
        console.log(`     node scripts/diagnose-fix-manager-employee-link.mjs --fix ${user.email} ${byEmail.code}`);
      } else if (byName.length === 1) {
        console.log(`  -> Likely match by name: Employee ${byName[0].code} (${byName[0].name}, email: ${byName[0].email}). Fix with:`);
        console.log(`     node scripts/diagnose-fix-manager-employee-link.mjs --fix ${user.email} ${byName[0].code}`);
      } else if (byName.length > 1) {
        console.log(`  -> ${byName.length} employees share a similar name - check manually: ${byName.map(e => `${e.code} (${e.email})`).join(", ")}`);
      } else {
        console.log(`  -> No obvious match by email or name - find the right Employee code manually, then run --fix.`);
      }
    }
  }

  console.log(`\nSummary: ${broken} of ${managerUsers.length} manager-ish user(s) have a broken/missing employeeId link.`);
  if (broken === 0) {
    console.log("No broken links found in this database - if the report is still happening, check you're pointed at the right DB (see the ENVIRONMENT note at the top of this script).");
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("\nScript failed:", err.message);
  mongoose.disconnect();
  process.exit(1);
});
