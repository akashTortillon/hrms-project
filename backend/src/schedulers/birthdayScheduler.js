import cron from "node-cron";
import Employee from "../models/employeeModel.js";
import Announcement from "../models/announcementModel.js";

/**
 * Creates a birthday announcement (category BIRTHDAY, audience ALL) for every active
 * employee whose date of birth falls on the current day. Idempotent: skips anyone who
 * already has a BIRTHDAY announcement created today, so restarts/multiple ticks don't
 * duplicate. Runs daily; also runs once at startup.
 */
class BirthdayScheduler {
  constructor() {
    this.task = null;
    this.isRunning = false;
  }

  async runOnce() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    // Active employees with a DOB matching today's month/day.
    const employees = await Employee.find({
      status: "Active",
      dob: { $ne: null }
    }).select("name dob profilePhotoUrl profilePhotoPath profilePhotoStorage");

    const birthdayPeople = employees.filter((e) => {
      if (!e.dob) return false;
      const d = new Date(e.dob);
      return d.getMonth() + 1 === month && d.getDate() === day;
    });

    if (!birthdayPeople.length) return 0;

    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let created = 0;

    for (const emp of birthdayPeople) {
      // Dedup: already announced today for this employee?
      const exists = await Announcement.findOne({
        category: "BIRTHDAY",
        employeeIds: emp._id,
        publishedAt: { $gte: startOfDay }
      });
      if (exists) continue;

      await Announcement.create({
        title: `🎉 Happy Birthday, ${emp.name}!`,
        message: `Wishing ${emp.name} a very happy birthday today! 🎂`,
        category: "BIRTHDAY",
        audience: "ALL",
        employeeIds: [emp._id],
        publishedBy: null,
        imageUrl: emp.profilePhotoUrl || "",
        imagePath: emp.profilePhotoPath || "",
        imageStorage: emp.profilePhotoStorage || ""
      });
      created++;
    }

    if (created > 0) console.log(`[BirthdayScheduler] Created ${created} birthday announcement(s).`);
    return created;
  }

  start() {
    // Daily at 00:10 server time.
    this.task = cron.schedule("10 0 * * *", async () => {
      if (this.isRunning) return;
      this.isRunning = true;
      try {
        await this.runOnce();
      } catch (error) {
        console.error("[BirthdayScheduler] Daily run failed:", error);
      } finally {
        this.isRunning = false;
      }
    });

    console.log("[BirthdayScheduler] Scheduled daily birthday-announcement job registered.");
    this.runOnce().catch((err) => console.error("[BirthdayScheduler] Startup run failed:", err.message));
  }

  stop() {
    if (this.task) {
      this.task.stop();
      console.log("[BirthdayScheduler] Scheduler stopped.");
    }
  }
}

export default new BirthdayScheduler();
