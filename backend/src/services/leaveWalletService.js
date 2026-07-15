import LeaveWallet from "../models/leaveWalletModel.js";
import LeaveLedger from "../models/leaveLedgerModel.js";
import { getDailySalary } from "../utils/salaryUtils.js";

const getOrCreateWallet = async (employeeId, leaveTypeId) => {
  let wallet = await LeaveWallet.findOne({ employee: employeeId, leaveType: leaveTypeId });
  if (!wallet) {
    wallet = await LeaveWallet.create({ employee: employeeId, leaveType: leaveTypeId });
  }
  return wallet;
};

// Credits days to a wallet and writes the matching ledger entry. Used by the
// anniversary accrual cron, yearly CL/SL credit, and manual corrections.
const creditWallet = async ({ employeeId, leaveTypeId, days, transactionType, remarks = "", requestId = null, createdBy = null }) => {
  const wallet = await getOrCreateWallet(employeeId, leaveTypeId);
  const balanceBefore = wallet.balanceDays;

  wallet.creditedDays += days;
  wallet.balanceDays += days;
  wallet.lastCreditDate = new Date();

  // If this credit clears (or partially clears) a negative balance from an advance
  // leave, flag the offset amount + its exact locked deduction amount so HR can issue
  // the matching payroll refund. Refund amount is proportional to the locked deduction
  // (pendingDeductionAmount / pendingDeductionDays), never recomputed at current salary —
  // it must equal what was actually deducted, even if salary changed since then.
  if (balanceBefore < 0) {
    const offset = Math.min(days, -balanceBefore);
    if (offset > 0) {
      const ratePerDay = wallet.pendingDeductionDays > 0 ? wallet.pendingDeductionAmount / wallet.pendingDeductionDays : 0;
      const offsetAmount = Math.min(offset, wallet.pendingDeductionDays) * ratePerDay;

      wallet.pendingRefundDays += offset;
      wallet.pendingRefundAmount += offsetAmount;
      wallet.pendingDeductionDays = Math.max(0, wallet.pendingDeductionDays - offset);
      wallet.pendingDeductionAmount = Math.max(0, wallet.pendingDeductionAmount - offsetAmount);

      await LeaveLedger.create({
        employee: employeeId,
        leaveType: leaveTypeId,
        transactionType: "REFUND",
        days: offset,
        remarks: `Advance leave offset by new credit — payroll refund of ${offsetAmount.toFixed(2)} pending`,
        request: requestId,
        createdBy
      });
    }
  }

  await wallet.save();

  await LeaveLedger.create({
    employee: employeeId,
    leaveType: leaveTypeId,
    transactionType,
    days,
    remarks,
    request: requestId,
    createdBy
  });

  return wallet;
};

// Expires any unused positive balance (carryForward === false on the leave type),
// right before the next cycle's credit lands. Only zeroes balanceDays — leaves
// pendingDeduction/pendingRefund untouched, those are a separate advance-leave
// concern and aren't affected by a carry-forward policy.
const expireBalance = async ({ employeeId, leaveTypeId, remarks = "" }) => {
  const wallet = await getOrCreateWallet(employeeId, leaveTypeId);
  const forfeited = wallet.balanceDays;
  if (forfeited <= 0) return wallet;

  wallet.balanceDays = 0;
  await wallet.save();

  await LeaveLedger.create({
    employee: employeeId,
    leaveType: leaveTypeId,
    transactionType: "LEAVE_ADJUSTMENT",
    days: -forfeited,
    remarks: remarks || `Unused balance (${forfeited}d) expired — carry-forward disabled for this leave type`
  });

  return wallet;
};

// Debits days from a wallet (leave taken, or advance leave that goes negative)
// and writes the matching ledger entry.
const debitWallet = async ({ employeeId, leaveTypeId, days, transactionType, remarks = "", requestId = null, createdBy = null }) => {
  const wallet = await getOrCreateWallet(employeeId, leaveTypeId);
  wallet.usedDays += days;
  wallet.balanceDays -= days;
  await wallet.save();

  await LeaveLedger.create({
    employee: employeeId,
    leaveType: leaveTypeId,
    transactionType,
    days: -days,
    remarks,
    request: requestId,
    createdBy
  });

  return wallet;
};

// Grants leave before eligibility: debits the wallet (goes negative) and computes +
// locks the salary deduction (dailySalary-at-grant-time x days) onto the wallet, so a
// later refund always matches exactly what was deducted regardless of future salary changes.
const grantAdvanceLeave = async ({ employeeId, leaveTypeId, days, employee, remarks = "", requestId = null, createdBy = null }) => {
  const wallet = await debitWallet({
    employeeId, leaveTypeId, days,
    transactionType: "ADVANCE_LEAVE",
    remarks: remarks || "Advance leave granted before eligibility",
    requestId, createdBy
  });

  const now = new Date();
  const dailySalary = getDailySalary(employee, now.getMonth() + 1, now.getFullYear());
  const deductionAmount = Number((dailySalary * days).toFixed(2));

  wallet.pendingDeductionDays += days;
  wallet.pendingDeductionAmount += deductionAmount;
  await wallet.save();

  return { wallet, deductionAmount, dailySalary };
};

// Anniversary-based service years: month/day comparison, not day-count division,
// so leap years never drift the count.
const completedServiceYears = (joinDate, asOf = new Date()) => {
  const join = new Date(joinDate);
  let years = asOf.getFullYear() - join.getFullYear();
  const anniversaryPassed =
    asOf.getMonth() > join.getMonth() ||
    (asOf.getMonth() === join.getMonth() && asOf.getDate() >= join.getDate());
  if (!anniversaryPassed) years -= 1;
  return Math.max(0, years);
};

const isAnniversaryToday = (joinDate, today = new Date()) => {
  const join = new Date(joinDate);
  return join.getMonth() === today.getMonth() && join.getDate() === today.getDate();
};

export default {
  getOrCreateWallet,
  creditWallet,
  debitWallet,
  expireBalance,
  grantAdvanceLeave,
  completedServiceYears,
  isAnniversaryToday
};
