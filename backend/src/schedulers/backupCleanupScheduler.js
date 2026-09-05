import cron from "node-cron";
import BackupJob from "../models/backupJobModel.js";
import { deleteS3Object } from "../utils/storage.js";

const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS) || 7;

class BackupCleanupScheduler {
  constructor() {
    this.task = null;
    this.isRunning = false;
  }

  start() {
    console.log(`[BackupCleanupScheduler] Registering daily cleanup (retention: ${RETENTION_DAYS} days) at 03:00...`);
    this.task = cron.schedule("0 3 * * *", async () => {
      if (this.isRunning) {
        console.log("[BackupCleanupScheduler] Previous cleanup is still active, skipping overlapping tick...");
        return;
      }

      this.isRunning = true;
      try {
        await this.cleanup();
      } catch (error) {
        console.error("[BackupCleanupScheduler] Cleanup failed:", error);
      } finally {
        this.isRunning = false;
      }
    });
    console.log("[BackupCleanupScheduler] Scheduled job successfully registered and active.");
  }

  async cleanup() {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const staleJobs = await BackupJob.find({ createdAt: { $lt: cutoff } });

    for (const job of staleJobs) {
      if (job.s3Key) {
        try {
          await deleteS3Object(job.s3Key);
        } catch (err) {
          console.error("[BackupCleanupScheduler] S3 delete failed:", err.message);
        }
      }
      await BackupJob.deleteOne({ _id: job._id });
    }

    if (staleJobs.length) {
      console.log(`[BackupCleanupScheduler] Cleaned up ${staleJobs.length} backup job(s) older than ${RETENTION_DAYS} days.`);
    }
  }
}

export default new BackupCleanupScheduler();
