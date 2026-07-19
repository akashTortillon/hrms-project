import cron from "node-cron";
import Employee from "../models/employeeModel.js";
import Master from "../models/masterModel.js";
import leaveWalletService from "../services/leaveWalletService.js";

/**
 * Daily accrual job for leave types configured on the LEAVE_TYPE master:
 *  - metadata.allocationType === "SERVICE_ANNIVERSARY" (Home Leave / Annual Leave): credits
 *    metadata.daysPerCycle (or the employee's LeaveWallet.overrideDays if set) once per
 *    year, on each employee's own joining-date anniversary.
 *  - metadata.allocationType === "YEARLY": credits metadata.daysPerCycle once per
 *    calendar year on Jan 1 (e.g. Casual Leave, Sick Leave).
 * Idempotent per day via lastCreditDate check, so restarts/multiple ticks don't double-credit.
 *
 * Optional service-year tiering: metadata.tiers = [{ afterYears, days }, ...]. When
 * present, the credit amount is the highest tier whose afterYears <= the employee's
 * completedServiceYears as of today (step-up and stays — e.g. 15d after 1yr, 30d after
 * 2yr+). Falls back to flat metadata.daysPerCycle if no tier threshold is met yet, or
 * if metadata.tiers is absent/empty. Per-employee LeaveWallet.overrideDays always wins
 * over both.
 */
const resolveCreditDays = (leaveType, daysPerCycle, joinDate, now) => {
  const tiers = Array.isArray(leaveType.metadata?.tiers) ? leaveType.metadata.tiers : [];
  if (!tiers.length) return daysPerCycle;

  const years = leaveWalletService.completedServiceYears(joinDate, now);
  const applicable = tiers
    .map(t => ({ afterYears: Number(t.afterYears), days: Number(t.days) }))
    .filter(t => Number.isFinite(t.afterYears) && Number.isFinite(t.days) && t.afterYears <= years)
    .sort((a, b) => a.afterYears - b.afterYears)
    .pop();

  return applicable ? applicable.days : daysPerCycle;
};

class LeaveAccrualScheduler {
  constructor() {
    this.task = null;
    this.isRunning = false;
  }

  async runOnce() {
    const now = new Date();
    const leaveTypes = await Master.find({ type: "LEAVE_TYPE", isActive: true });
    const accrualTypes = leaveTypes.filter(lt => {
      const alloc = lt.metadata?.allocationType;
      return alloc === "SERVICE_ANNIVERSARY" || alloc === "YEARLY";
    });
    if (!accrualTypes.length) return 0;

    const employees = await Employee.find({ status: "Active", joinDate: { $ne: null } })
      .select("_id joinDate");

    let creditedCount = 0;

    for (const leaveType of accrualTypes) {
      const alloc = leaveType.metadata?.allocationType;
      const daysPerCycle = Number(leaveType.metadata?.daysPerCycle) || 0;
      const hasTiers = Array.isArray(leaveType.metadata?.tiers) && leaveType.metadata.tiers.length > 0;
      if (!daysPerCycle && !hasTiers) continue;

      for (const emp of employees) {
        const dueToday =
          alloc === "SERVICE_ANNIVERSARY"
            ? leaveWalletService.isAnniversaryToday(emp.joinDate, now)
            : (now.getMonth() === 0 && now.getDate() === 1);
        if (!dueToday) continue;

        const wallet = await leaveWalletService.getOrCreateWallet(emp._id, leaveType._id);

        // Already credited today? Skip (handles restarts / multiple ticks same day).
        if (wallet.lastCreditDate) {
          const last = new Date(wallet.lastCreditDate);
          if (last.getFullYear() === now.getFullYear() && last.getMonth() === now.getMonth() && last.getDate() === now.getDate()) {
            continue;
          }
        }

        const days = wallet.overrideDays != null
          ? wallet.overrideDays
          : resolveCreditDays(leaveType, daysPerCycle, emp.joinDate, now);
        if (!days) continue; // no flat days and no tier met yet (e.g. tiers start after year 1)

        // Carry-forward off: unused balance from the prior cycle is forfeited right
        // before the new cycle's credit lands (a negative balance from advance leave
        // is left alone — expireBalance no-ops on balanceDays <= 0).
        if (leaveType.metadata?.carryForward === false) {
          await leaveWalletService.expireBalance({
            employeeId: emp._id,
            leaveTypeId: leaveType._id,
            remarks: `Unused ${leaveType.name} balance expired at new cycle (carry-forward disabled)`
          });
        }

        await leaveWalletService.creditWallet({
          employeeId: emp._id,
          leaveTypeId: leaveType._id,
          days,
          transactionType: "ANNUAL_CREDIT",
          remarks: alloc === "SERVICE_ANNIVERSARY" ? "Home Leave / Annual credit (joining-date anniversary)" : "Yearly allocation credit"
        });

        // Advance leave offset: if wallet was negative (advance taken before eligibility),
        // this credit absorbs it and any remainder becomes a payroll refund upstream.
        creditedCount++;
      }
    }

    if (creditedCount > 0) console.log(`[LeaveAccrualScheduler] Credited ${creditedCount} wallet(s).`);
    return creditedCount;
  }

  start() {
    // Daily at 00:20 server time (after birthday scheduler).
    this.task = cron.schedule("20 0 * * *", async () => {
      if (this.isRunning) return;
      this.isRunning = true;
      try {
        await this.runOnce();
      } catch (error) {
        console.error("[LeaveAccrualScheduler] Daily run failed:", error);
      } finally {
        this.isRunning = false;
      }
    });

    console.log("[LeaveAccrualScheduler] Scheduled daily leave-accrual job registered.");
    this.runOnce().catch((err) => console.error("[LeaveAccrualScheduler] Startup run failed:", err.message));
  }

  stop() {
    if (this.task) {
      this.task.stop();
      console.log("[LeaveAccrualScheduler] Scheduler stopped.");
    }
  }
}

export default new LeaveAccrualScheduler();
