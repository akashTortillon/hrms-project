import "dotenv/config";
import mongoose from "mongoose";
import Employee from "../src/models/employeeModel.js";
import User from "../src/models/userModel.js";
import Request from "../src/models/requestModel.js";
import Master from "../src/models/masterModel.js";
import SystemSettings from "../src/models/systemSettingsModel.js";
import BiometricTransaction from "../src/models/biometricTransactionModel.js";
import Attendance from "../src/models/attendanceModel.js";

const DB_URL = process.env.DB_URL;

const ymd = (d) => d.toISOString().split("T")[0];

async function main() {
  await mongoose.connect(DB_URL);

  const rep9a = await Employee.findOne({ code: "ZZT-REP9A" });
  const rep9b = await Employee.findOne({ code: "ZZT-REP9B" });
  const loanEmp = await Employee.findOne({ code: "ZZT-LOANEMP9" });
  const loanEmpUser = await User.findOne({ email: loanEmp.email });
  if (!rep9a || !rep9b || !loanEmp) {
    throw new Error("Run zztest-manual-walkthrough-seed.mjs first.");
  }

  // --- Item 2: per-employee week-off (Tuesday instead of Sunday) ---
  await Employee.updateOne({ _id: rep9a._id }, { $set: { weekOffDay: 2 } });

  // --- Item 1: Incomplete attendance - checkout-only and check-in-only past days ---
  // Clear anything from prior runs of this script.
  await BiometricTransaction.deleteMany({ badgeNumber: { $in: ["ZZT-REP9B"] } });
  await Attendance.deleteMany({ employee: rep9b._id, date: { $in: ["2026-08-03", "2026-08-04"] } });

  const checkoutOnlyDate = new Date("2026-08-03T14:05:00.000Z"); // 18:05 UAE
  const checkinOnlyDate = new Date("2026-08-04T05:10:00.000Z"); // 09:10 UAE
  await BiometricTransaction.create([
    {
      transactionId: 900000001,
      badgeNumber: "ZZT-REP9B",
      timestamp: checkoutOnlyDate,
      transactionType: "OUT",
      deviceId: "ZZT-TEST-DEVICE"
    },
    {
      transactionId: 900000002,
      badgeNumber: "ZZT-REP9B",
      timestamp: checkinOnlyDate,
      transactionType: "IN",
      deviceId: "ZZT-TEST-DEVICE"
    }
  ]);

  // --- Item 4: public holiday, deliberately on the rep9a's new Tuesday off-day's
  // week AND on a Sunday, to exercise both "holiday on a normal weekday" and
  // "holiday vs weekend precedence" ---
  let settings = await SystemSettings.findOne();
  if (!settings) settings = await SystemSettings.create({});
  settings.holidays = (settings.holidays || []).filter(h => h.name !== "ZZT Test Holiday");
  settings.holidays.push({ name: "ZZT Test Holiday", date: new Date("2026-08-09T00:00:00.000Z") }); // a Sunday
  await settings.save();

  // --- Item 3: Maternity Leave request (doesn't match sick/casual/annual/unpaid
  // substrings - the bug this item fixes) ---
  const maternityType = await Master.findOne({ type: "LEAVE_TYPE", name: /maternity/i });
  await Request.deleteMany({ requestId: "REQZZTMAT1" });
  await Request.create({
    userId: rep9a.user ? rep9a.user._id : (await User.findOne({ email: rep9a.email }))._id,
    requestId: "REQZZTMAT1",
    requestType: "LEAVE",
    status: "APPROVED",
    currentApprovalStage: "COMPLETED",
    details: {
      leaveType: maternityType?.name || "Maternity Leave",
      leaveTypeId: maternityType?._id,
      fromDate: "2026-07-01",
      toDate: "2026-07-05",
      numberOfDays: 5,
      leavePayStatus: "FULLY_PAID"
    },
    submittedAt: new Date("2026-06-20")
  });

  // --- Item 6: long company name for PDF wrap test ---
  await Employee.updateOne(
    { _id: loanEmp._id },
    { $set: { company: "ZZT Extremely Long Testing Company Name For PDF Wrap Verification International Holdings LLC" } }
  );

  // --- Item 10: role + user with NO MANAGE_PAYROLL initially, to test the
  // grant-then-refresh flow ---
  await Master.updateOne(
    { type: "ROLE", name: "ZZT Payroll Test Role" },
    { $set: { type: "ROLE", name: "ZZT Payroll Test Role", permissions: ["VIEW_DASHBOARD"] } },
    { upsert: true }
  );
  const dept = (await mongoose.connection.collection("masters").findOne({ type: "DEPARTMENT" }))?.name || "General";
  const bcrypt = (await import("bcryptjs")).default;
  const hashedPassword = await bcrypt.hash("ZZTestPass123!", 10);
  await Employee.deleteMany({ code: "ZZT-PAYTEST9" });
  await User.deleteMany({ email: "zzt-paytest9@example.com" });
  const payTestEmp = await Employee.create({
    name: "ZZT PayTest Nine", code: "ZZT-PAYTEST9", email: "zzt-paytest9@example.com",
    phone: "+971501111199", department: dept, role: "ZZT Payroll Test Role", status: "Active",
    shift: "Day Shift", joinDate: new Date()
  });
  await User.create({
    name: "ZZT PayTest Nine", email: payTestEmp.email, phone: "+971501111198",
    password: hashedPassword, role: "ZZT Payroll Test Role", employeeId: payTestEmp._id
  });

  console.log(`
Round-4 fixtures ready:
  ZZT Report Nine A (zzt-rep9a@example.com) - weekOffDay=Tuesday(2)
  ZZT Report Nine B (zzt-rep9b@example.com) - has raw BiometricTransactions:
      2026-08-03: OUT only (checkout-only Incomplete test)
      2026-08-04: IN only  (check-in-only Incomplete test, was already working)
    Run: node scripts/reprocess-attendance.mjs   then check Attendance status for both dates.
  Holiday "ZZT Test Holiday" added on 2026-08-09 (a Sunday).
  Maternity Leave (REQZZTMAT1) approved for ZZT Report Nine A, 2026-07-01..05.
  ZZT Loan Employee Nine company set to a long name for payslip PDF wrap test.
  ZZT PayTest Nine (zzt-paytest9@example.com / ZZTestPass123!) - role has NO MANAGE_PAYROLL yet.
      Grant it: db.masters.updateOne({type:'ROLE',name:'ZZT Payroll Test Role'},{$set:{permissions:['VIEW_DASHBOARD','MANAGE_PAYROLL']}})
`);

  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
