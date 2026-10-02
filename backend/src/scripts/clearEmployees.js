/**
 * Deletes ALL employees so they can be re-imported from scratch.
 *
 * What it removes:
 *   - every Employee
 *   - the login User accounts linked to those employees (users with an employeeId and a
 *     role other than Admin). Users with no employee link are left alone.
 *   - with --cascade: everything keyed to the deleted employees/users - Attendance,
 *     Payroll, LeaveWallet, LeaveLedger, EmployeeDocument, Appraisal, Warning,
 *     EmployeeTraining, Assignment, and Requests raised by the deleted users. Without
 *     --cascade these are left behind pointing at employees that no longer exist
 *     (orphans), which you almost certainly don't want before a re-import.
 *
 * What it never touches: Admin users (their employee link is just cleared), Masters
 * (shifts, roles, departments...), BiometricTransaction (raw punches), sync state, Assets.
 * After re-importing employees, rebuild attendance with
 *   node src/scripts/backfillAttendanceFromBiometric.js --live
 *
 * SAFE BY DEFAULT: runs in DRY RUN - prints what would be deleted, deletes nothing.
 * Pass --live to actually delete. This is destructive and cannot be undone.
 *
 * Usage:
 *   node src/scripts/clearEmployees.js                       # dry run
 *   node src/scripts/clearEmployees.js --live --cascade      # recommended: clean slate for re-import
 *   node src/scripts/clearEmployees.js --live                # employees + their logins only
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Employee from "../models/employeeModel.js";
import User from "../models/userModel.js";
import Attendance from "../models/attendanceModel.js";
import Payroll from "../models/payrollModel.js";
import LeaveWallet from "../models/leaveWalletModel.js";
import LeaveLedger from "../models/leaveLedgerModel.js";
import EmployeeDocument from "../models/employeeDocumentModel.js";
import Appraisal from "../models/appraisalModel.js";
import Warning from "../models/warningModel.js";
import EmployeeTraining from "../models/trainingModel.js";
import Assignment from "../models/assignmentModel.js";
import Request from "../models/requestModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const args = process.argv.slice(2);
const LIVE = args.includes("--live");
const CASCADE = args.includes("--cascade");
const uriArg = args.find(a => a.startsWith("--uri="));
const DB_URI = uriArg ? uriArg.split("=")[1] : process.env.DB_URL; // --uri= overrides .env DB_URL

async function main() {
  await mongoose.connect(DB_URI);
  console.log(`Connected to: ${DB_URI}`);
  console.log(`Database: ${mongoose.connection.db.databaseName}`);
  console.log(`Mode: ${LIVE ? "LIVE (will delete)" : "DRY RUN (no writes)"}`);
  console.log(`Cascade to dependent data: ${CASCADE ? "YES" : "no (orphans will remain)"}`);

  const employeeIds = (await Employee.find({}).select("_id").lean()).map(e => e._id);

  const loginFilter = { employeeId: { $ne: null }, role: { $ne: "Admin" } };
  const userIds = (await User.find(loginFilter).select("_id").lean()).map(u => u._id);
  const adminLinkFilter = { role: "Admin", employeeId: { $ne: null } };

  const dependents = [
    { name: "Attendance", model: Attendance, filter: { employee: { $in: employeeIds } } },
    { name: "Payroll", model: Payroll, filter: { employee: { $in: employeeIds } } },
    { name: "LeaveWallet", model: LeaveWallet, filter: { employee: { $in: employeeIds } } },
    { name: "LeaveLedger", model: LeaveLedger, filter: { employee: { $in: employeeIds } } },
    { name: "EmployeeDocument", model: EmployeeDocument, filter: { employeeId: { $in: employeeIds } } },
    { name: "Appraisal", model: Appraisal, filter: { employee: { $in: employeeIds } } },
    { name: "Warning", model: Warning, filter: { employeeId: { $in: employeeIds } } },
    { name: "EmployeeTraining", model: EmployeeTraining, filter: { employee: { $in: employeeIds } } },
    { name: "Assignment", model: Assignment, filter: { $or: [{ fromEmployee: { $in: employeeIds } }, { toEmployee: { $in: employeeIds } }] } },
    { name: "Request (raised by deleted users)", model: Request, filter: { userId: { $in: userIds } } }
  ];

  console.log(`\nEmployees ${LIVE ? "to delete" : "that would be deleted"}: ${employeeIds.length}`);
  console.log(`Linked login users ${LIVE ? "to delete" : "that would be deleted"} (non-Admin): ${userIds.length}`);
  console.log(`Admin users whose employee link would be cleared: ${await User.countDocuments(adminLinkFilter)}`);
  console.log(`Other users left untouched (no employee link, or Admin): ${await User.countDocuments({ _id: { $nin: userIds } })}`);

  console.log(`\nDependent data ${CASCADE ? (LIVE ? "to delete" : "that would be deleted") : "that would be left as ORPHANS (pass --cascade to delete)"}:`);
  for (const d of dependents) {
    d.count = await d.model.countDocuments(d.filter);
    console.log(`  ${d.name}: ${d.count}`);
  }

  if (LIVE) {
    if (CASCADE) {
      for (const d of dependents) {
        if (d.count > 0) await d.model.deleteMany(d.filter);
      }
    }
    await User.updateMany(adminLinkFilter, { $set: { employeeId: null } });
    if (userIds.length) await User.deleteMany({ _id: { $in: userIds } });
    const res = await Employee.deleteMany({});
    console.log(`\nLIVE MODE - deleted ${res.deletedCount} employee(s) and ${userIds.length} linked login(s).`);
    console.log("Next: re-import employees, then rebuild attendance:");
    console.log("  node src/scripts/backfillAttendanceFromBiometric.js --live");
  } else {
    console.log("\nDRY RUN - nothing deleted. Re-run with --live (and usually --cascade) to apply.");
  }

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
