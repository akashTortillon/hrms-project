import cron from "node-cron";
import Employee from "../models/employeeModel.js";
import { applyDuePendingTransfers } from "../controllers/employeeController.js";

/**
 * Promotes future-dated employee transfers once their effectiveDate arrives, so a scheduled
 * transfer takes effect even if nobody opens the employee's profile that day (payroll,
 * reports, etc. read the employee directly). Read paths also apply due transfers lazily;
 * this daily pass is the backstop that guarantees consistency.
 */
class TransferScheduler {
  constructor() {
    this.task = null;
    this.isRunning = false;
  }

  async runOnce() {
    const now = new Date();
    const employees = await Employee.find({
      transferHistory: {
        $elemMatch: { applied: false, effectiveDate: { $lte: now } }
      }
    });

    let applied = 0;
    for (const employee of employees) {
      try {
        const changed = await applyDuePendingTransfers(employee);
        if (changed) applied++;
      } catch (err) {
        console.error(`[TransferScheduler] Failed to apply transfer for ${employee?.code}:`, err.message);
      }
    }

    if (applied > 0) {
      console.log(`[TransferScheduler] Applied ${applied} due transfer(s).`);
    }
    return applied;
  }

  start() {
    // Every day at 00:05 server time.
    this.task = cron.schedule("5 0 * * *", async () => {
      if (this.isRunning) return;
      this.isRunning = true;
      try {
        await this.runOnce();
      } catch (error) {
        console.error("[TransferScheduler] Daily transfer promotion failed:", error);
      } finally {
        this.isRunning = false;
      }
    });

    console.log("[TransferScheduler] Scheduled daily transfer-promotion job registered.");

    // Also run once at startup to catch anything that came due while the server was down.
    this.runOnce().catch((err) => console.error("[TransferScheduler] Startup run failed:", err.message));
  }

  stop() {
    if (this.task) {
      this.task.stop();
      console.log("[TransferScheduler] Scheduler stopped.");
    }
  }
}

export default new TransferScheduler();
