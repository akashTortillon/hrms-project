import Employee from "../models/employeeModel.js";
import Attendance from "../models/attendanceModel.js";
import BiometricTransaction from "../models/biometricTransactionModel.js";
import badgeNumberCache from "./badgeNumberCache.js";
import {
  getShiftRules,
  calculateLateTier,
  calculateDuration,
  getApprovedLeavesMap,
  isLeave
} from "../utils/attendanceUtils.js";

// UAE local "today" as YYYY-MM-DD, matching the +4h anchor this file already uses to
// bucket transactions onto a calendar day. A lone check-in on TODAY just means the
// employee hasn't left yet (mid-shift, not an error) - it only becomes a genuine
// "missing checkout" data problem once the day itself has passed with no checkout ever
// recorded, so this is compared against `record.date` before ever assigning Incomplete.
const getUaeTodayDateStr = () => {
  const uaeNow = new Date(Date.now() + 4 * 60 * 60 * 1000);
  return uaeNow.toISOString().split("T")[0];
};

class AttendanceProcessor {
  /**
   * Processes an array of raw biometric transactions into Attendance records
   * @param {Array} transactions Array of biometric transactions
   * @returns {Promise<Object>} Object containing counts of created, updated, skipped, and unmapped badges
   */
  async processTransactions(transactions) {
    const stats = {
      created: 0,
      updated: 0,
      skipped: 0,
      unmappedBadges: new Set()
    };

    if (!transactions || transactions.length === 0) {
      return stats;
    }

    // 1. Fetch employees FIRST (not after grouping) - overnight shifts (Night Shift /
    // Flexible Night Shift) need shift-aware bucketing below, which requires knowing
    // each punch's employee before it can be placed in the right bucket.
    const employeeCodes = new Set();
    for (const txn of transactions) {
      if (!txn.badgeNumber || !txn.timestamp) continue;
      employeeCodes.add(txn.badgeNumber.trim());
    }
    const codesArray = Array.from(employeeCodes);
    const employeesList = await Employee.find({
      $or: [
        { badgeNumber: { $in: codesArray } },
        { code: { $in: codesArray } }
      ]
    });
    const leaveMap = await getApprovedLeavesMap(employeesList);
    const findEmployee = (badge) => employeesList.find(e =>
      (e.badgeNumber && e.badgeNumber.trim() === badge) ||
      (e.code && e.code.trim() === badge)
    );

    // A calendar-day bucket (00:00-23:59 UAE) is wrong for Night/Flexible Night Shift:
    // a punch just after midnight is the CHECKOUT completing the shift that started the
    // evening before, not a check-in for the new calendar day. Left as calendar-day, the
    // real evening check-in (e.g. 16:14) and that leftover morning checkout from the
    // PREVIOUS night (e.g. 04:20) both land in the same bucket and get picked as a single
    // bogus check-in/check-out pair - reversed and nonsensical. Shift name is the only
    // reliable signal available (this device's transactionType is generic/untrustworthy -
    // see below), so any shift with "night" in its name is treated as overnight and
    // bucketed on a noon-to-noon UAE window instead of midnight-to-midnight: a typical
    // evening-in/morning-out night shift falls entirely inside one such window, while
    // still keeping consecutive nights separate.
    const isOvernightShift = (shiftName) => /night/i.test(shiftName || "");
    const uaeTimeOf = (d) => new Date(new Date(d).getTime() + 4 * 60 * 60 * 1000);
    const shiftDateStrFor = (timestamp, overnight) => {
      const uaeTime = uaeTimeOf(timestamp);
      if (!overnight) return uaeTime.toISOString().split("T")[0];
      // Shift the clock back 12h before reading the date, so noon becomes the bucket
      // edge instead of midnight - a 00:00-11:59 punch falls onto the PREVIOUS
      // shift-day (the tail end of a shift that started the evening before).
      const anchored = new Date(uaeTime.getTime() - 12 * 60 * 60 * 1000);
      return anchored.toISOString().split("T")[0];
    };

    // 2. Group transactions by Employee Code (Badge Number) + shift-day
    const grouped = {};
    for (const txn of transactions) {
      if (!txn.badgeNumber || !txn.timestamp) continue;

      const code = txn.badgeNumber.trim();
      const employee = findEmployee(code);
      const overnight = isOvernightShift(employee?.shift);
      const dateStr = shiftDateStrFor(txn.timestamp, overnight);
      const key = `${code}_${dateStr}`;

      if (!grouped[key]) {
        grouped[key] = {
          badgeNumber: code,
          employeeName: txn.rawData?.EmployeeName || null, // Capture name from BioCloud
          date: dateStr,
          checkIn: null,
          checkOut: null
        };
      } else if (!grouped[key].employeeName && txn.rawData?.EmployeeName) {
        grouped[key].employeeName = txn.rawData.EmployeeName;
      }
    }

    // checkIn/checkOut are NOT derived from txn.transactionType/timeStr here anymore -
    // this device reports every punch with the same generic StatusId (no real direction),
    // so classifyPunchDirection can't be trusted (see biometricSyncService.js). Direction
    // is instead resolved per employee+day just before use, below, from the FULL set of
    // that day's stored punches (not just this batch - see comment there for why).

    // 3. Process each grouped record
    for (const key in grouped) {
      const record = grouped[key];
      const employee = findEmployee(record.badgeNumber);

      if (!employee) {
        console.warn(`[AttendanceProcessor] Employee with badge number ${record.badgeNumber} not found.`);
        stats.unmappedBadges.add(record.badgeNumber);
        continue;
      }

      const overnight = isOvernightShift(employee.shift);

      // Resolve check-in/check-out from the FULL shift-day's punches, not just this
      // batch - check-in and check-out routinely land in separate sync batches (checked
      // in mid-morning, synced; checked out in the evening, synced later), and this batch
      // alone can't tell direction anyway. Window matches how `record.date` was bucketed
      // above: calendar day (00:00-23:59) for normal shifts, noon-to-noon for overnight
      // ones, so the re-query here can't disagree with the grouping that produced `record`.
      const dayStart = overnight
        ? new Date(`${record.date}T12:00:00+04:00`)
        : new Date(`${record.date}T00:00:00+04:00`);
      const dayEnd = overnight
        ? new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1)
        : new Date(`${record.date}T23:59:59.999+04:00`);
      const dayPunches = await BiometricTransaction.find({
        badgeNumber: record.badgeNumber,
        timestamp: { $gte: dayStart, $lte: dayEnd }
      }).sort({ timestamp: 1 });

      const toUaeTimeStr = (d) => {
        const uaeTime = new Date(new Date(d).getTime() + 4 * 60 * 60 * 1000);
        return uaeTime.toISOString().split("T")[1].substring(0, 5);
      };
      // Minutes elapsed since this shift-day's bucket start (dayStart, above) - NOT raw
      // time-of-day. An overnight shift's checkout (e.g. 04:20) now correctly shares a
      // bucket with its evening check-in (e.g. 16:14), and raw time-of-day minutes would
      // go negative across that midnight rollover (260 - 974) when summing segments below.
      // Counting from the bucket start instead increases monotonically through the whole
      // window regardless of whether it crosses midnight.
      const minutesSinceBucketStart = (d) => Math.round((new Date(d).getTime() - dayStart.getTime()) / 60000);

      record.checkIn = dayPunches.length ? toUaeTimeStr(dayPunches[0].timestamp) : null;
      record.checkOut = dayPunches.length > 1 ? toUaeTimeStr(dayPunches[dayPunches.length - 1].timestamp) : null;

      // Work hours sum only the IN->OUT segments (punch pairs 0-1, 2-3, ...), NOT a naive
      // first-punch-to-last-punch span - a break in the middle (e.g. Check-In 01:06,
      // Break-Out 10:01, Break-In 16:02, Check-Out 19:01) would otherwise count the ~6h
      // break itself as work (01:06->19:01 = 17h55m instead of the real ~11h worked). A
      // trailing unpaired punch (still clocked in, no checkout yet) contributes no segment
      // - matches the existing "no checkout yet" handling elsewhere in this function.
      record.workHours = null;
      if (dayPunches.length >= 2) {
        let workMinutes = 0;
        for (let i = 0; i + 1 < dayPunches.length; i += 2) {
          workMinutes += minutesSinceBucketStart(dayPunches[i + 1].timestamp) - minutesSinceBucketStart(dayPunches[i].timestamp);
        }
        record.workHours = `${Math.floor(workMinutes / 60)}h ${workMinutes % 60}m`;
      }

      // HRMS is the source of truth for employee name - only auto-fill from BioCloud
      // when the HRMS record has no name at all (e.g. a brand-new employee whose
      // profile hasn't been filled in yet). Never overwrite a name HR has already
      // set: this used to fire on every sync whenever the two differed at all,
      // which silently reverted deliberate name edits (including case changes)
      // back to whatever the device has on file the next time that employee badged in.
      if (record.employeeName && !employee.name?.trim()) {
        console.log(`[AttendanceProcessor] Filling blank employee name from BioCloud: "${record.employeeName}" for badge ${record.badgeNumber} (${employee.code})`);
        employee.name = record.employeeName.trim();
        await employee.save();
      }

      // Check if employee has approved leave request for this date
      if (isLeave(employee._id, record.date, leaveMap)) {
        console.log(`[AttendanceProcessor SKIP] ${record.badgeNumber} on ${record.date} is on Approved Leave.`);
        stats.skipped++;
        continue;
      }

      // Check if existing attendance record is "On Leave"
      const existingRecord = await Attendance.findOne({ employee: employee._id, date: record.date });
      if (existingRecord && existingRecord.status === "On Leave") {
        console.log(`[AttendanceProcessor SKIP] ${record.badgeNumber} on ${record.date} status is already On Leave.`);
        stats.skipped++;
        continue;
      }

      // Get shift rules
      const shiftName = employee.shift || "Day Shift";
      const rules = await getShiftRules(shiftName);

      // Check if updating is needed
      if (existingRecord) {
        // record.checkIn/checkOut already reflect the full day's punches as of now (see
        // the BiometricTransaction query above), so this merge is normally a no-op - kept
        // as a safety net so a stale/incomplete `existingRecord` (e.g. from before that
        // full-day resolution existed, or a partial write) can't regress an already-correct
        // earlier value: still take the EARLIEST check-in and LATEST check-out seen across
        // record and the saved row, never "record wins outright".
        const mergedCheckIn = [record.checkIn, existingRecord.checkIn]
          .filter(Boolean)
          .sort()[0] ?? null;
        const mergedCheckOut = [record.checkOut, existingRecord.checkOut]
          .filter(Boolean)
          .sort()
          .pop() ?? null;
        // record.workHours is already break-aware (summed IN->OUT segments from the full
        // day's punches, computed above) - only fall back to the naive span if this merge
        // somehow picked a check-in/check-out that didn't come from record itself (the
        // safety-net case described above), since there's no punch-segment data for that.
        const mergedWorkHours = (mergedCheckIn === record.checkIn && mergedCheckOut === record.checkOut)
          ? record.workHours
          : calculateDuration(mergedCheckIn, mergedCheckOut);

        let mergedStatus = "Absent";
        let mergedLateTier = 0;
        if (mergedCheckIn) {
          mergedLateTier = calculateLateTier(mergedCheckIn, rules);
          mergedStatus = mergedLateTier > 0 ? "Late" : "Present";
          // A checked-in employee with no checkout on a day that's already over never
          // came back to badge out - flag it instead of quietly calling it Present/Late.
          if (!mergedCheckOut && record.date < getUaeTodayDateStr()) {
            mergedStatus = "Incomplete";
          }
        } else if (mergedCheckOut && record.date < getUaeTodayDateStr()) {
          // Mirror image of the above: a checkout with no matching check-in ever
          // recorded (missed/failed IN punch, or a mis-synced OUT-only device event).
          // Previously fell through to the "Absent" default, which is wrong - the
          // employee clearly was here. Flag it the same way as the check-in-only case.
          mergedStatus = "Incomplete";
        }
        // If times are already identical, skip to prevent unnecessary writes/triggers
        if (
          existingRecord.checkIn === mergedCheckIn &&
          existingRecord.checkOut === mergedCheckOut &&
          existingRecord.status === mergedStatus &&
          existingRecord.lateTier === mergedLateTier &&
          existingRecord.workHours === mergedWorkHours
        ) {
          stats.skipped++;
          continue;
        }

        // If manually edited, preserve manual edit details
        if (existingRecord.isManuallyEdited) {
          console.log(`[AttendanceProcessor SKIP] ${record.badgeNumber} on ${record.date} was manually edited. Skipping.`);
          stats.skipped++;
          continue;
        }

        // Update existing record
        existingRecord.checkIn = mergedCheckIn;
        existingRecord.checkOut = mergedCheckOut;
        existingRecord.status = mergedStatus;
        existingRecord.lateTier = mergedLateTier;
        existingRecord.workHours = mergedWorkHours;
        existingRecord.shift = shiftName;
        await existingRecord.save();
        stats.updated++;
      } else {
        // No existing record yet for this employee+date - record.checkIn/checkOut (the
        // full day's earliest/latest punch, resolved above) is authoritative as-is.
        let status = "Absent";
        let lateTier = 0;
        if (record.checkIn) {
          lateTier = calculateLateTier(record.checkIn, rules);
          status = lateTier > 0 ? "Late" : "Present";
          if (!record.checkOut && record.date < getUaeTodayDateStr()) {
            status = "Incomplete";
          }
        } else if (record.checkOut && record.date < getUaeTodayDateStr()) {
          // Checkout with no check-in ever recorded - same "clearly not Absent" case
          // as the merge-branch above, just for the first transaction seen for this
          // employee+date (no existing record to merge against yet).
          status = "Incomplete";
        }
        const workHours = record.workHours;

        // Create new record
        await Attendance.create({
          employee: employee._id,
          date: record.date,
          shift: shiftName,
          checkIn: record.checkIn,
          checkOut: record.checkOut,
          status,
          lateTier,
          workHours
        });
        stats.created++;
      }
    }

    return {
      created: stats.created,
      updated: stats.updated,
      skipped: stats.skipped,
      unmappedBadges: Array.from(stats.unmappedBadges)
    };
  }
}

export default new AttendanceProcessor();