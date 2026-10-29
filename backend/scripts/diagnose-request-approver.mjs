/**
 * diagnose-request-approver.mjs   (READ-ONLY - never writes)
 *
 * PURPOSE:
 *   Explains why a request shows "Waiting for manager/finance approval" with no
 *   Approve button for a given viewer. Prints who the request is actually waiting
 *   on (the snapshot stored at submission), who the employee's CURRENT designated
 *   manager / finance manager are (live), and whether the viewer passes the same
 *   isManagerApprover / isFinanceApprover checks the approval endpoint enforces.
 *
 * USAGE:
 *   node scripts/diagnose-request-approver.mjs REQ123 viewer@email.com
 *   node scripts/diagnose-request-approver.mjs REQ123            # request only, no viewer
 *
 * ENVIRONMENT:
 *   Reads MONGO_URI (or DB_URL) from .env
 */
import "dotenv/config";
import mongoose from "mongoose";
import Request from "../src/models/requestModel.js";
import User from "../src/models/userModel.js";
import Employee from "../src/models/employeeModel.js";
import Master from "../src/models/masterModel.js";

const DB_URL = process.env.MONGO_URI || process.env.DB_URL;
const [requestId, viewerEmail] = process.argv.slice(2);
if (!DB_URL || !requestId) {
  console.error("Usage: node scripts/diagnose-request-approver.mjs <requestId e.g. REQ123> [viewerEmail]");
  process.exit(1);
}

const escapeRegex = (v = "") => String(v).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const idStr = (v) => (v ? String(v._id || v) : null);
const describeUser = (u) => (u ? `${u.name} <${u.email}> role="${u.role}" userId=${u._id} employeeId=${u.employeeId || "(none)"}` : "(none)");
const describeEmp = (e) => (e ? `${e.name} [${e.code}] employeeId=${e._id} email=${e.email}` : "(none)");

// Employee._id -> User (same resolution createRequest uses)
const userForEmployee = async (employeeId) => {
  if (!employeeId) return null;
  return (await User.findById(employeeId))
    || (await User.findOne({ employeeId }))
    || (async () => {
      const emp = await Employee.findById(employeeId).select("email");
      return emp?.email ? User.findOne({ email: { $regex: new RegExp(`^${escapeRegex(emp.email)}$`, "i") } }) : null;
    })();
};

await mongoose.connect(DB_URL);
console.log(`Connected: ${mongoose.connection.host} / ${mongoose.connection.name}\n`);

const request = await Request.findOne({ requestId });
if (!request) { console.log(`Request ${requestId} not found.`); process.exit(1); }

const requester = await User.findById(request.userId);
const requesterEmp = requester?.employeeId
  ? await Employee.findById(requester.employeeId)
  : await Employee.findOne({ email: { $regex: new RegExp(`^${escapeRegex(requester?.email || "")}$`, "i") } });

console.log("== REQUEST");
console.log(`${request.requestId} type=${request.requestType} subType=${request.details?.subType || "-"} status=${request.status} stage=${request.currentApprovalStage}`);
console.log(`requested by: ${describeUser(requester)}`);
console.log(`managerApproval=${request.managerApproval?.status} financeApproval=${request.financeApproval?.status} hrApproval=${request.hrApproval?.status}`);

const snapMgr = request.designatedManager ? await User.findById(request.designatedManager) : null;
const snapFin = request.designatedFinanceManager ? await User.findById(request.designatedFinanceManager) : null;
console.log("\n== SNAPSHOT stored on the request at submission (this is who it is WAITING on)");
console.log(`designatedManager       : ${describeUser(snapMgr)}`);
console.log(`designatedFinanceManager: ${describeUser(snapFin)}`);

console.log("\n== LIVE employee record (current assignment)");
console.log(`employee: ${describeEmp(requesterEmp)}`);
const liveMgrUser = await userForEmployee(requesterEmp?.designatedManager);
const liveFinUser = await userForEmployee(requesterEmp?.designatedFinanceManager);
console.log(`designatedManager       : ${describeEmp(requesterEmp?.designatedManager ? await Employee.findById(requesterEmp.designatedManager) : null)}  -> user ${describeUser(liveMgrUser)}`);
console.log(`designatedFinanceManager: ${describeEmp(requesterEmp?.designatedFinanceManager ? await Employee.findById(requesterEmp.designatedFinanceManager) : null)}  -> user ${describeUser(liveFinUser)}`);
console.log(`\nSame person for manager and finance (snapshot)? ${snapMgr && snapFin ? String(snapMgr._id) === String(snapFin._id) : "n/a"}`);
console.log(`Same person for manager and finance (live)?     ${liveMgrUser && liveFinUser ? String(liveMgrUser._id) === String(liveFinUser._id) : "n/a"}`);
console.log(`Snapshot stale vs live manager?                 ${snapMgr && liveMgrUser ? String(snapMgr._id) !== String(liveMgrUser._id) : "n/a"}`);

if (viewerEmail) {
  const viewer = await User.findOne({ email: { $regex: new RegExp(`^${escapeRegex(viewerEmail)}$`, "i") } });
  console.log(`\n== VIEWER ${viewerEmail}`);
  if (!viewer) { console.log("No such user."); }
  else {
    const role = await Master.findOne({ type: "ROLE", name: { $regex: new RegExp(`^${escapeRegex(viewer.role)}$`, "i") } });
    const perms = role?.permissions || [];
    console.log(describeUser(viewer));
    console.log(`role permissions: ${JSON.stringify(perms)}`);
    const ids = [idStr(viewer), idStr(viewer.employeeId)].filter(Boolean);
    const isSnapMgr = ids.includes(idStr(request.designatedManager));
    const isLiveMgr = ids.includes(idStr(requesterEmp?.designatedManager)) ;
    const isSnapFin = ids.includes(idStr(request.designatedFinanceManager));
    const isLiveFin = ids.includes(idStr(requesterEmp?.designatedFinanceManager));
    const hasMgrPerm = viewer.role === "Manager" || perms.includes("APPROVE_MANAGER_REQUESTS");
    const hasFinPerm = viewer.role === "Finance Manager" || /^Finance/i.test(viewer.role) || perms.includes("APPROVE_FINANCE_REQUESTS") || perms.includes("ALL");
    console.log(`is designated manager  : snapshot=${isSnapMgr} live=${isLiveMgr}  | has manager permission=${hasMgrPerm}  => can act at MANAGER stage: ${(isSnapMgr || isLiveMgr) && hasMgrPerm}`);
    console.log(`is designated finance  : snapshot=${isSnapFin} live=${isLiveFin}  | has finance permission=${hasFinPerm}  => can act at FINANCE stage: ${(isSnapFin || isLiveFin) && hasFinPerm}`);
    if ((isSnapMgr || isLiveMgr) && (isSnapFin || isLiveFin) && hasMgrPerm && hasFinPerm) {
      console.log("=> Viewer is BOTH: a single Approve at MANAGER stage should auto-complete the Finance step too.");
    }
    if (!(isSnapMgr || isLiveMgr) && (isSnapFin || isLiveFin)) {
      console.log("=> Viewer is ONLY the finance designee here. The request is waiting on the MANAGER shown above, not on this viewer.");
    }
  }
}
await mongoose.disconnect();
