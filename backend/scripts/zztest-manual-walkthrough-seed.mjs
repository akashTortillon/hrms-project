import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Employee from "../src/models/employeeModel.js";
import User from "../src/models/userModel.js";
import Request from "../src/models/requestModel.js";

const DB_URL = process.env.DB_URL;
const PASS = "ZZTestPass123!";

async function main() {
  await mongoose.connect(DB_URL);
  const dept = (await mongoose.connection.collection("masters").findOne({ type: "DEPARTMENT" }))?.name || "General";
  const hashedPassword = await bcrypt.hash(PASS, 10);

  const codes = ["ZZT-ADMIN9", "ZZT-MGR9", "ZZT-REP9A", "ZZT-REP9B", "ZZT-UNREL9", "ZZT-MGR9B", "ZZT-REP9C", "ZZT-FINMGR9", "ZZT-LOANEMP9"];
  const emails = codes.map(c => `${c.toLowerCase()}@example.com`);
  await Employee.deleteMany({ code: { $in: codes } });
  await User.deleteMany({ email: { $in: emails } });
  await Request.deleteMany({ requestId: { $in: ["REQZZTW1", "REQZZTW2"] } });

  const mk = async (code, name, role, status = "Active") => {
    const emp = await Employee.create({
      name, code, email: `${code.toLowerCase()}@example.com`, phone: `+97150${Math.floor(1000000 + Math.random() * 8999999)}`,
      department: dept, role, status, shift: "Day Shift", joinDate: new Date()
    });
    const user = await User.create({
      name, email: emp.email, phone: `+97150${Math.floor(1000000 + Math.random() * 8999999)}`,
      password: hashedPassword, role, employeeId: emp._id
    });
    return { emp, user };
  };

  // 1) Admin - overview login (items 5, 14 visual checks)
  const admin = await mk("ZZT-ADMIN9", "ZZT Admin Nine", "Admin");

  // 2) Manager + 2 reports + 1 unrelated employee (item 8: scoping)
  const mgr = await mk("ZZT-MGR9", "ZZT Manager Nine", "Manager");
  const rep1 = await mk("ZZT-REP9A", "ZZT Report Nine A", "Employee", "On Leave"); // item 12: self-view despite non-Active status
  const rep2 = await mk("ZZT-REP9B", "ZZT Report Nine B", "Employee");
  await Employee.updateMany({ code: { $in: ["ZZT-REP9A", "ZZT-REP9B"] } }, { $set: { designatedManager: mgr.emp._id } });
  const unrelated = await mk("ZZT-UNREL9", "ZZT Unrelated Nine", "Employee");

  // 3) Manager whose User account has NO employeeId linked (simulates bulk-import gap)
  //    + a report - submitting a leave request as this report should still route to
  //    Manager stage once approved (item 6/7's auto-heal fallback).
  const mgr2Emp = await Employee.create({
    name: "ZZT Manager Nine B", code: "ZZT-MGR9B", email: "zzt-mgr9b@example.com", phone: "+971501111192",
    department: dept, role: "Manager", status: "Active", shift: "Day Shift", joinDate: new Date()
  });
  await User.create({
    name: "ZZT Manager Nine B", email: "zzt-mgr9b@example.com", phone: "+971501111193",
    password: hashedPassword, role: "Manager" // no employeeId - the gap
  });
  const rep3 = await mk("ZZT-REP9C", "ZZT Report Nine C", "Employee");
  await Employee.updateOne({ code: "ZZT-REP9C" }, { $set: { designatedManager: mgr2Emp._id } });

  // 4) Finance Manager + loan employee with pending FINANCE-stage request carrying
  //    existing adjustment/payment history (items 9/10: audit trail visibility)
  const finMgr = await mk("ZZT-FINMGR9", "ZZT Finance Manager Nine", "Finance Manager");
  const loanEmp = await mk("ZZT-LOANEMP9", "ZZT Loan Employee Nine", "Employee");

  await Request.create({
    userId: loanEmp.user._id,
    requestId: "REQZZTW1",
    requestType: "SALARY",
    status: "PENDING",
    currentApprovalStage: "FINANCE",
    financeApproval: { status: "PENDING" },
    hrApproval: { status: "PENDING" },
    details: {
      subType: "loan",
      amount: 12000,
      requestedAmount: 12000,
      totalRepaymentAmount: 12000,
      monthlyRepaymentAmount: 1000,
      repaymentPeriod: 10,
      adjustmentHistory: [{
        previousMonthlyRepaymentAmount: 1200,
        newMonthlyRepaymentAmount: 1000,
        previousRepaymentPeriod: 10,
        newRepaymentPeriod: 10,
        remainingBalanceAtAdjustment: 10000,
        reason: "Employee requested lower monthly deduction (test)",
        adjustedBy: admin.user._id,
        adjustedByName: "ZZT Admin Nine",
        adjustedAt: new Date("2026-07-15")
      }]
    },
    payrollDeductions: [
      { month: "06", year: "2026", amount: 1200, date: new Date("2026-06-28") },
      { month: "07", year: "2026", amount: 1000, date: new Date("2026-07-28") }
    ],
    designatedFinanceManager: finMgr.user._id,
    submittedAt: new Date()
  });

  // Also an already-APPROVED loan on the same employee, so the Loans tab
  // (EmployeeDetail.jsx) has something to show adjustment/payment history on too.
  await Request.create({
    userId: loanEmp.user._id,
    requestId: "REQZZTW2",
    requestType: "SALARY",
    status: "APPROVED",
    currentApprovalStage: "COMPLETED",
    details: {
      subType: "loan",
      amount: 6000,
      requestedAmount: 6000,
      totalRepaymentAmount: 6000,
      monthlyRepaymentAmount: 500,
      repaymentPeriod: 12,
      adjustmentHistory: [{
        previousMonthlyRepaymentAmount: 600,
        newMonthlyRepaymentAmount: 500,
        previousRepaymentPeriod: 10,
        newRepaymentPeriod: 12,
        remainingBalanceAtAdjustment: 6000,
        reason: "Reduced monthly deduction on employee request (test)",
        adjustedBy: admin.user._id,
        adjustedByName: "ZZT Admin Nine",
        adjustedAt: new Date("2026-07-01")
      }]
    },
    payrollDeductions: [
      { month: "07", year: "2026", amount: 500, date: new Date("2026-07-28") }
    ],
    submittedAt: new Date("2026-06-01")
  });

  console.log(`
Login credentials (all password: ${PASS}):
  Admin:            zzt-admin9@example.com
  Manager:          zzt-mgr9@example.com        (reports: ZZT Report Nine A, ZZT Report Nine B; unrelated: ZZT Unrelated Nine)
  Report A (self):  zzt-rep9a@example.com       (status=On Leave, for item 12 self-view test)
  Report C:         zzt-rep9c@example.com       (manager is unlinked - submit leave to test item 6/7)
  Finance Manager:  zzt-finmgr9@example.com     (has 1 pending loan approval REQZZTW1 to review)
  Loan Employee:    zzt-loanemp9@example.com    (has approved loan REQZZTW2 with adjustment history)
`);

  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
