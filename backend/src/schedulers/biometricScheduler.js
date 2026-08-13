import cron from "node-cron";
import biometricSyncService from "../services/biometricSyncService.js";

class BiometricScheduler {
  constructor() {
    this.task = null;
    this.isRunning = false;
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
  }

  /**
   * Stops the background scheduler job
   */
  stop() {
    if (this.task) {
      this.task.stop();
      console.log("[BiometricScheduler] Scheduler stopped successfully.");
    }
  }
}

export default new BiometricScheduler();