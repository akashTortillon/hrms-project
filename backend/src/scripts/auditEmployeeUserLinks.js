/**
 * READ-ONLY AUDIT. Reports the scope of the Employee<->User link problem behind
 * "Linked user account not found for this employee." (resetEmployeePassword,
 * employeeController.js). User.employeeId is the authoritative link but is only ever
 * set by addEmployee/importEmployees at creation time - importEmployees never sets it
 * at all, and updateEmployee never repairs it or keeps User.email in sync when an
 * employee's email changes later. This script categorizes every Employee into:
 *
 *   linkedCorrectly     - a User exists with employeeId == this Employee's _id
 *   linkableByEmail      - no User has this employeeId, but one exists with a matching
 *                          email (the bulk-import gap - fixable by just setting employeeId)
 *   noUserAtAll          - no User exists by employeeId OR by current email (needs a
 *                          brand-new account provisioned, e.g. Ansab's case)
 *
 * Also reports the reverse: Users with no employeeId at all, which may be legitimate
 * non-employee logins (admin/system accounts) or further bulk-import orphans - printed
 * with role so it's possible to eyeball which is which, not assumed either way.
 *
 * Writes nothing. Usage: node src/scripts/auditEmployeeUserLinks.js
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Employee from "../models/employeeModel.js";
import User from "../models/userModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const uriArg = process.argv.find(a => a.startsWith("--uri="));
const DB_URI = uriArg ? uriArg.split("=")[1] : process.env.DB_URL;

async function main() {
  await mongoose.connect(DB_URI);
  console.log(`Connected to: ${DB_URI}`);

  const employees = await Employee.find({}).select("name code email").lean();
  const users = await User.find({}).select("email employeeId role").lean();

  const userByEmployeeId = new Map();
  const userByEmail = new Map();
  for (const u of users) {
    if (u.employeeId) userByEmployeeId.set(String(u.employeeId), u);
    if (u.email) userByEmail.set(u.email.toLowerCase(), u);
  }

  let linkedCorrectly = 0;
  const linkableByEmail = [];
  const noUserAtAll = [];

  for (const e of employees) {
    if (userByEmployeeId.has(String(e._id))) {
      linkedCorrectly++;
      continue;
    }
    const byEmail = e.email ? userByEmail.get(e.email.toLowerCase()) : null;
    if (byEmail) {
      linkableByEmail.push({ name: e.name, code: e.code, email: e.email });
    } else {
      noUserAtAll.push({ name: e.name, code: e.code, email: e.email });
    }
  }

  const employeeIds = new Set(employees.map(e => String(e._id)));
  const unlinkedUsers = users.filter(u => !u.employeeId);
  const danglingUsers = users.filter(u => u.employeeId && !employeeIds.has(String(u.employeeId)));

  console.log("\n=== Summary ===");
  console.log(`Total employees: ${employees.length}`);
  console.log(`Total users: ${users.length}`);
  console.log(`Correctly linked (employeeId matches): ${linkedCorrectly}`);
  console.log(`Linkable by email (User exists, employeeId unset - bulk-import gap): ${linkableByEmail.length}`);
  console.log(`No User at all (needs a new account provisioned - Ansab's case): ${noUserAtAll.length}`);
  console.log(`Users with no employeeId (legitimate non-employee logins OR orphans - inspect roles below): ${unlinkedUsers.length}`);
  console.log(`Users with employeeId pointing at a deleted/nonexistent Employee (dangling): ${danglingUsers.length}`);

  console.log("\n=== Linkable-by-email sample (first 20) ===");
  for (const e of linkableByEmail.slice(0, 20)) {
    console.log(`  ${e.name} (${e.code}) - ${e.email}`);
  }
  if (linkableByEmail.length > 20) console.log(`  ... and ${linkableByEmail.length - 20} more`);

  console.log("\n=== No-User-at-all sample (first 20) ===");
  for (const e of noUserAtAll.slice(0, 20)) {
    console.log(`  ${e.name} (${e.code}) - ${e.email}`);
  }
  if (noUserAtAll.length > 20) console.log(`  ... and ${noUserAtAll.length - 20} more`);

  console.log("\n=== Unlinked Users by role (no employeeId) ===");
  const byRole = {};
  for (const u of unlinkedUsers) {
    byRole[u.role || "(no role)"] = (byRole[u.role || "(no role)"] || 0) + 1;
  }
  for (const [role, count] of Object.entries(byRole)) {
    console.log(`  ${role}: ${count}`);
  }

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
