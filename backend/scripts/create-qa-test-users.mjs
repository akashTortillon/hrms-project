/**
 * create-qa-test-users.mjs
 *
 * PURPOSE:
 *   Creates a small, clearly-labeled set of test Employee+User accounts so the
 *   10-item approval/scoping/payroll batch (loan two-step approval, manager
 *   employee-scoping, leave/medical-doc flow, self-service visibility, payroll
 *   adjustments/export) can be clicked through manually on a real environment,
 *   without touching any real employee, role, or request data.
 *
 *   Creates (idempotent - safe to re-run):
 *     - Role "QA Dual Approver" (Masters > Roles) - only if it doesn't already
 *       exist. Carries BOTH manager- and finance-approval permissions, so the
 *       "same person approves both stages" case (point 1) can be tested without
 *       touching the real "Manager"/"Finance Manager" role documents.
 *     - QA Test Manager      (role: Manager)
 *     - QA Test Finance Mgr  (role: Finance Manager)
 *     - QA Test Dual Approver (role: QA Dual Approver - both permissions)
 *     - QA Test Employee A   - designatedManager = QA Test Manager,
 *                              designatedFinanceManager = QA Test Finance Mgr
 *                              (different people - tests the normal two-step flow)
 *     - QA Test Employee B   - designatedManager = designatedFinanceManager =
 *                              QA Test Dual Approver (same person - tests the
 *                              single-click collapse)
 *
 *   Does NOT modify any existing Employee, User, or Role document. Every email/
 *   code uses a "qa-test-" / "QA-" prefix so these are trivially easy to find
 *   and delete later with:
 *     db.employees.deleteMany({ code: /^QA-/ })
 *     db.users.deleteMany({ email: /^qa-test-/ })
 *     db.masters.deleteOne({ type: "ROLE", name: "QA Dual Approver" })
 *
 * USAGE:
 *   node scripts/create-qa-test-users.mjs            # Preview mode (no DB writes)
 *   node scripts/create-qa-test-users.mjs --apply     # Actually create the accounts
 *
 * WARNING:
 *   This writes to whatever database the running .env's MONGO_URI/DB_URL points
 *   at. If that .env is pointed at production, these become real, live accounts
 *   in the production database (not destructive - creates only, never deletes or
 *   modifies - but still real data). Check your .env before running --apply.
 *
 * ENVIRONMENT:
 *   Reads MONGO_URI (or DB_URL) from .env
 */

import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Employee from "../src/models/employeeModel.js";
import User from "../src/models/userModel.js";
import Master from "../src/models/masterModel.js";

const DB_URL = process.env.MONGO_URI || process.env.DB_URL;
const MODE = process.argv.includes("--apply") ? "apply" : "preview";
const TEST_PASSWORD = "QaTest@2026!";

const PEOPLE = [
  {
    key: "manager",
    code: "QA-MGR",
    name: "QA Test Manager",
    email: "qa-test-manager@test.internal",
    phone: "+971500000001",
    role: "Manager"
  },
  {
    key: "financeManager",
    code: "QA-FIN",
    name: "QA Test Finance Mgr",
    email: "qa-test-finance@test.internal",
    phone: "+971500000002",
    role: "Finance Manager"
  },
  {
    key: "dualApprover",
    code: "QA-DUAL",
    name: "QA Test Dual Approver",
    email: "qa-test-dual@test.internal",
    phone: "+971500000003",
    role: "QA Dual Approver"
  },
  {
    key: "employeeA",
    code: "QA-EMP-A",
    name: "QA Test Employee A",
    email: "qa-test-employee-a@test.internal",
    phone: "+971500000004",
    role: "Employee",
    designatedManagerKey: "manager",
    designatedFinanceManagerKey: "financeManager"
  },
  {
    key: "employeeB",
    code: "QA-EMP-B",
    name: "QA Test Employee B",
    email: "qa-test-employee-b@test.internal",
    phone: "+971500000005",
    role: "Employee",
    designatedManagerKey: "dualApprover",
    designatedFinanceManagerKey: "dualApprover"
  }
];

async function run() {
  if (!DB_URL) {
    console.error("MONGO_URI / DB_URL is not set in .env");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(DB_URL);
  console.log(`Connected: ${mongoose.connection.host} / ${mongoose.connection.name}`);
  console.log(`Mode: ${MODE.toUpperCase()}\n`);

  // 1. Ensure the "QA Dual Approver" role exists - never touches the real
  // "Manager"/"Finance Manager" role documents.
  const existingRole = await Master.findOne({ type: "ROLE", name: "QA Dual Approver" });
  if (existingRole) {
    console.log('Role "QA Dual Approver" already exists - leaving it as-is.');
  } else if (MODE === "apply") {
    await Master.create({
      type: "ROLE",
      name: "QA Dual Approver",
      description: "QA test role: holds both manager- and finance-approval permissions, for testing the same-person loan auto-approve collapse.",
      permissions: ["VIEW_DASHBOARD", "VIEW_ALL_EMPLOYEES", "APPROVE_MANAGER_REQUESTS", "APPROVE_FINANCE_REQUESTS"],
      isActive: true
    });
    console.log('Created role "QA Dual Approver".');
  } else {
    console.log('[preview] Would create role "QA Dual Approver".');
  }

  const createdEmployeeIds = {};
  const summary = [];

  for (const person of PEOPLE) {
    const existingEmployee = await Employee.findOne({ code: person.code });
    const existingUser = await User.findOne({ email: person.email });

    if (existingEmployee && existingUser) {
      console.log(`SKIP  ${person.name} (${person.code}) - already exists.`);
      createdEmployeeIds[person.key] = existingEmployee._id;
      summary.push({ ...person, status: "already existed" });
      continue;
    }

    if (MODE === "preview") {
      console.log(`[preview] Would create ${person.name} (${person.code}, role: ${person.role}).`);
      summary.push({ ...person, status: "preview only" });
      continue;
    }

    let employee = existingEmployee;
    if (!employee) {
      employee = await Employee.create({
        name: person.name,
        code: person.code,
        role: person.role,
        department: "QA TESTING",
        email: person.email,
        phone: person.phone,
        joinDate: new Date(),
        status: "Active"
      });
    }
    createdEmployeeIds[person.key] = employee._id;

    if (!existingUser) {
      const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);
      await User.create({
        name: person.name,
        email: person.email,
        phone: person.phone,
        password: hashedPassword,
        role: person.role,
        employeeId: employee._id
      });
    }

    console.log(`CREATED ${person.name} (${person.code}, role: ${person.role}).`);
    summary.push({ ...person, status: "created" });
  }

  // 2. Wire up designatedManager/designatedFinanceManager for the two test
  // employees, now that the manager/finance-manager Employee docs exist.
  if (MODE === "apply") {
    for (const person of PEOPLE) {
      if (!person.designatedManagerKey) continue;
      const managerId = createdEmployeeIds[person.designatedManagerKey];
      const financeId = createdEmployeeIds[person.designatedFinanceManagerKey];
      if (!managerId || !financeId) continue;
      await Employee.updateOne(
        { code: person.code },
        { $set: { designatedManager: managerId, designatedFinanceManager: financeId } }
      );
    }
    console.log("\nLinked designatedManager/designatedFinanceManager for QA Test Employee A and B.");
  } else {
    console.log("\n[preview] Would link designatedManager/designatedFinanceManager for QA Test Employee A and B.");
  }

  console.log("\n--- Summary ---");
  console.table(summary.map(p => ({ Name: p.name, Code: p.code, Email: p.email, Role: p.role, Status: p.status })));

  if (MODE === "apply") {
    console.log(`\nAll test accounts use the password: ${TEST_PASSWORD}`);
    console.log("\nWho to use for which of the 10 points:");
    console.log("  1 (duplicate approval, same person)   -> log in as QA Test Dual Approver, approve a loan submitted by QA Test Employee B");
    console.log("  1 (two different people, contrast)    -> log in as QA Test Manager, then QA Test Finance Mgr, for a loan from QA Test Employee A");
    console.log("  2 (leave buttons + medical doc)        -> QA Test Employee A submits sick leave w/ doc, QA Test Manager approves");
    console.log("  3 (self-service Loans/Leave/payslip)   -> log in as QA Test Employee A or B");
    console.log("  4 (manager employee-scoping)           -> log in as QA Test Manager or QA Test Finance Mgr, check Employees page");
    console.log("  5 (attendance Late status)             -> mark attendance for QA Test Employee A/B against a real Shift Master");
    console.log("  6 (loan Paid/Outstanding)               -> QA Test Employee A/B, after a loan has payroll deductions");
    console.log("  7 (payslip last-2 + download)          -> QA Test Employee A/B dashboard");
    console.log("  8, 9, 10 (payroll export/adjust, employee export) -> use your own Admin login");
  } else {
    console.log("\nRun again with --apply to actually create these accounts.");
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
