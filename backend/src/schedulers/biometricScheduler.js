import cron from "node-cron";
import biometricSyncService from "../services/biometricSyncService.js";

// BioCloud's transaction Id is assigned in per-device upload order, not global event
// time. The scheduled 10-min tick uses `IdFrom = lastSyncedTransactionId` (a one-way
// ratchet on the highest Id ever seen) to stay fast. If one device uploads to BioCloud
// late - after other devices have already pushed the cursor past that device's (lower)
// Id range - that device's transactions fall permanently below the cursor floor and are
// silently skipped by every future scheduled tick (confirmed: device "RIZAN 1" /
// CQZ7231961693 on 2026-08-15, Ids 427456-427478 landed under a cursor already at
// 427656). The daily sweep below re-requests a trailing window with IdFrom=0
// (bypassing the cursor entirely) so any such straggler gets picked up automatically.
// It's cheap to re-run: every transaction already stored is skipped via the unique
// `transactionId` index (see biometricSyncService.js), so only genuinely new/orphaned
// rows get inserted and reprocessed into Attendance.
const SWEEP_TRAILING_DAYS = parseInt(process.env.BIOCLOUD_SWEEP_TRAILING_DAYS) || 3;

const formatYYYYMMDD = (d) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

class BiometricScheduler {
  constructor() {
    this.task = null;
    this.isRunning = false;
    this.sweepTask = null;
    this.isSweeping = false;
  }

  /**
   * Starts the background scheduler job
   */
  start() {
    const interval = parseInt(process.env.BIOCLOUD_SYNC_INTERVAL) || 10;
    const cronExpression = `*/${interval} * * * *`;

    console.log(`[BiometricScheduler] Registering cron execution job every ${interval} minutes...`);

    this.task = cron.schedule(cronExpression, async () => {
      if (this.isRunning) {
        console.log("[BiometricScheduler] Previous execution is still active, skipping overlapping tick...");
        return;
      }

      this.isRunning = true;
      try {
        console.log("[BiometricScheduler] Triggered automated sync execution tick...");
        await biometricSyncService.executeSyncJob("SCHEDULED");
      } catch (error) {
        console.error("[BiometricScheduler] Automated sync execution failed:", error);
      } finally {
        this.isRunning = false;
      }
    });

    console.log("[BiometricScheduler] Scheduled job successfully registered and active.");

    console.log(`[BiometricScheduler] Registering daily trailing sweep (last ${SWEEP_TRAILING_DAYS} days, IdFrom=0) at 02:45...`);

    this.sweepTask = cron.schedule("45 2 * * *", async () => {
      if (this.isSweeping) {
        console.log("[BiometricScheduler] Previous sweep is still active, skipping overlapping tick...");
        return;
      }

      this.isSweeping = true;
      try {
        const endDate = formatYYYYMMDD(new Date());
        const startDate = formatYYYYMMDD(new Date(Date.now() - SWEEP_TRAILING_DAYS * 24 * 60 * 60 * 1000));
        console.log(`[BiometricScheduler] Triggered daily trailing sweep: ${startDate} to ${endDate}...`);
        await biometricSyncService.executeSyncJob("SWEEP", startDate, endDate);
      } catch (error) {
        console.error("[BiometricScheduler] Daily trailing sweep failed:", error);
      } finally {
        this.isSweeping = false;
      }
    });

    console.log("[BiometricScheduler] Daily sweep job successfully registered and active.");
  }

  /**
   * Stops the background scheduler job
   */
  stop() {
    if (this.task) {
      this.task.stop();
      console.log("[BiometricScheduler] Scheduler stopped successfully.");
    }
    if (this.sweepTask) {
      this.sweepTask.stop();
      console.log("[BiometricScheduler] Daily sweep stopped successfully.");
    }
  }
}

export default new BiometricScheduler();