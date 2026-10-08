import Master from "../models/masterModel.js";
import Employee from "../models/employeeModel.js";
import Request from "../models/requestModel.js";
import User from "../models/userModel.js";
import SystemSettings from "../models/systemSettingsModel.js";
import BiometricTransaction from "../models/biometricTransactionModel.js";
import { shiftKey, findShiftByName, parseShiftHoursFromName } from "./shiftName.js";

// Helper: Parse time to minutes (HH:MM) -> minutes
export const toMinutes = (time) => {
  if (!time) return 0;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const UAE_OFFSET_MS = 4 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// UAE has no DST, so a fixed +4h shift is enough to read local date/time off a UTC instant.
export const uaeDateStr = (d) => new Date(new Date(d).getTime() + UAE_OFFSET_MS).toISOString().split("T")[0];
export const uaeTimeStr = (d) => new Date(new Date(d).getTime() + UAE_OFFSET_MS).toISOString().split("T")[1].substring(0, 5);
const addDaysStr = (dateStr, n) => {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split("T")[0];
};

// One occurrence of a shift, anchored to the date it STARTS on. end <= start means the
// shift runs into the next day, so 09:00-03:00 ends 03:00 tomorrow and 00:00-00:00 /
// 12:00-12:00 are full 24h windows. Returned as UTC instants.
export const getShiftWindow = (rules, shiftDate) => {
  const base = new Date(`${shiftDate}T00:00:00+04:00`).getTime();
  const startMin = toMinutes(rules.start);
  const endMin = toMinutes(rules.end);
  const start = base + startMin * 60000;
  let end = base + endMin * 60000;
  if (endMin <= startMin) end += DAY_MS;
  return { start: new Date(start), end: new Date(end) };
};

// Splits ONE employee's punches into shift occurrences using the shift's real
// start/end, instead of a calendar day. This device reports every punch with the same
// generic status (no IN/OUT direction), so direction is never read from the punch.
//   - A punch inside an occurrence's window always belongs to it.
//   - A punch in the gap between one window's end and the next one's start (e.g. Flexible
//     Day 03:00-09:00) is either the previous shift's late check-out or the next shift's
//     early check-in. It is the previous shift's check-out only if (a) it falls in the
//     first half of the gap (closer to that shift's end than the next shift's start) and
//     (b) that shift is still OPEN, i.e. has an odd number of punches INSIDE its window
//     (a check-in with no check-out yet). Otherwise it starts the next occurrence.
// Every decision uses only the punches inside the one neighbouring window, never an
// earlier decision, so the result is the same however far back the loaded history starts.
// (An earlier version tracked running parity across all days; one wrong guess at the start
// of the loaded history then shifted every later day by a punch, and the daily row, the
// punch modal and live sync disagreed depending on how much history each happened to load.)
// `punches` need `.timestamp` and must be sorted ascending. Returns Map<shiftDate, punch[]>.
export const assignPunchesToShiftDays = (punches, rules) => {
  const buckets = new Map();
  const add = (date, p) => {
    if (!buckets.has(date)) buckets.set(date, []);
    buckets.get(date).push(p);
  };

  // Pass 1: in-window punches are unambiguous. Gap punches wait for pass 2.
  const gapPunches = [];
  for (const p of punches) {
    const t = new Date(p.timestamp).getTime();
    const d = uaeDateStr(p.timestamp);
    const candidates = [addDaysStr(d, -1), d, addDaysStr(d, 1)];

    let owner = null;
    for (const c of candidates) {
      const w = getShiftWindow(rules, c);
      if (t >= w.start.getTime() && t < w.end.getTime()) { owner = c; break; }
    }
    if (owner) add(owner, p);
    else gapPunches.push({ p, t, d, candidates });
  }

  // Pass 2: split every gap into its two halves around the midpoint.
  //   - 2nd half (closer to the NEXT window's start): an early arrival for the next shift.
  //     Always belongs to that next occurrence, and counts as one of its punches.
  //   - 1st half (closer to the PREVIOUS window's end): either that shift's late check-out or,
  //     rarely, a very early arrival for the next one. Decided below.
  const gapInfo = gapPunches.map(({ p, t, d, candidates }) => {
    let prev = null;
    for (const c of candidates) {
      if (getShiftWindow(rules, c).end.getTime() <= t) prev = c;
    }
    const next = addDaysStr(prev || addDaysStr(d, -1), 1);
    let isLate = false; // second half of the gap = early arrival for `next`
    if (prev) {
      const gapStart = getShiftWindow(rules, prev).end.getTime();
      const gapEnd = getShiftWindow(rules, next).start.getTime();
      isLate = t >= gapStart + (gapEnd - gapStart) / 2;
    }
    return { p, prev, next, isLate };
  });

  // A shift is OPEN (checked in, not yet out) when it has an odd number of punches. Its punches
  // are the ones inside its window PLUS any early arrival before the window start: a person who
  // badges in at 15:52 for a 16:00 shift has that punch outside the window, and leaving it out
  // flipped the count so the next morning's check-out was taken for a new check-in. Only
  // second-half gap punches are counted here, which depend on the punch time alone (not on any
  // other decision), so the result never depends on how much history was loaded.
  const earlyArrivals = new Map();
  for (const g of gapInfo) {
    if (g.isLate) earlyArrivals.set(g.next, (earlyArrivals.get(g.next) || 0) + 1);
  }
  const punchCount = (date) => (buckets.get(date) || []).length + (earlyArrivals.get(date) || 0);

  const resolved = [];
  for (const { p, prev, next, isLate } of gapInfo) {
    const owner = !isLate && prev && punchCount(prev) % 2 === 1 ? prev : next;
    resolved.push({ owner, p });
  }
  // Add after all decisions so one gap punch never influences another's count.
  for (const { owner, p } of resolved) add(owner, p);

  // Keep every bucket chronological.
  for (const list of buckets.values()) list.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  return buckets;
};

// Loads the punches of the shift occurrence that STARTS on `shiftDate` for each employee
// (one batched query for everyone), using the same bucketing as the attendance processor
// so the daily list, the punch-detail modal and the stored rows always agree. Three days of
// slack on each side covers the previous occurrences whose open/closed state decides
// where a gap punch belongs. Returns Map<employeeId string, punch[]>.
export const getShiftDayPunches = async (employees, shiftDate, shiftNameFor = (e) => e.shift) => {
  const badgeOf = (e) => (e.badgeNumber || e.code || "").trim();
  const result = new Map();
  const badges = [...new Set(employees.map(badgeOf).filter(Boolean))];
  if (!badges.length) return result;

  const stored = await BiometricTransaction.find({
    badgeNumber: { $in: badges },
    timestamp: {
      $gte: new Date(`${addDaysStr(shiftDate, -3)}T00:00:00+04:00`),
      $lt: new Date(`${addDaysStr(shiftDate, 3)}T00:00:00+04:00`)
    }
  }).select("badgeNumber timestamp").sort({ timestamp: 1 }).lean();

  const byBadge = {};
  for (const p of stored) (byBadge[p.badgeNumber.trim()] ||= []).push({ timestamp: p.timestamp });

  const rulesCache = new Map();
  for (const e of employees) {
    const shiftName = shiftNameFor(e) || e.shift || "Day Shift";
    if (!rulesCache.has(shiftName)) rulesCache.set(shiftName, await getShiftRules(shiftName));
    const buckets = assignPunchesToShiftDays(byBadge[badgeOf(e)] || [], rulesCache.get(shiftName));
    result.set(String(e._id), buckets.get(shiftDate) || []);
  }
  return result;
};

// Turns one occurrence's punches into the Attendance fields. Check-out is only set when
// the punch count is even (every IN has its OUT) - with an odd count the last punch is an
// IN (back from a break, or just arrived) so the shift is still open. Work hours sum only
// completed IN->OUT pairs, so breaks between pairs are excluded.
export const summarizeShiftDay = (shiftDate, punches, rules) => {
  const count = punches.length;
  const first = punches[0];
  const closed = count >= 2 && count % 2 === 0;
  const last = closed ? punches[count - 1] : null;

  let workHours = null;
  if (count >= 2) {
    let minutes = 0;
    for (let i = 0; i + 1 < count; i += 2) {
      minutes += Math.round((new Date(punches[i + 1].timestamp) - new Date(punches[i].timestamp)) / 60000);
    }
    workHours = `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }

  return {
    checkIn: first ? uaeTimeStr(first.timestamp) : null,
    checkOut: last ? uaeTimeStr(last.timestamp) : null,
    checkOutNextDay: last ? uaeDateStr(last.timestamp) !== shiftDate : false,
    workHours,
    isOpen: !closed,
    window: getShiftWindow(rules, shiftDate)
  };
};

// Helper: Calculate duration between two times in HH:MM format
export const calculateDuration = (start, end) => {
  if (!start || !end) return null;
  const startMin = toMinutes(start);
  const endMin = toMinutes(end);
  let duration = endMin - startMin;
  if (duration < 0) duration += 24 * 60; // Handle overnight

  const h = Math.floor(duration / 60);
  const m = duration % 60;
  return `${h}h ${m}m`;
};

/**
 * Get Shift Rules from Master
 */
const warnedShiftNames = new Set();
const warnOnce = (message) => {
  if (warnedShiftNames.has(message)) return;
  warnedShiftNames.add(message);
  console.warn(`[getShiftRules] ${message}`);
};

export const getShiftRules = async (shiftName) => {
  // Exact name first (fast, the normal case). Employee.shift is the master's NAME, and the
  // same shift is often typed slightly differently ("1 PM - 4 PM" vs "1 PM-4 PM", "4AM" vs
  // "4 AM"), so on a miss compare ignoring case and spacing instead of silently treating it
  // as an unknown shift (which loses the shift's hours entirely).
  let shiftMaster = await Master.findOne({ type: "SHIFT", name: shiftName });
  if (!shiftMaster && shiftKey(shiftName)) {
    const allShifts = await Master.find({ type: "SHIFT" });
    shiftMaster = findShiftByName(allShifts, shiftName);
  }

  if (!shiftMaster) {
    warnOnce(`No shift in Masters matches "${shiftName}" - treating it as a plain calendar day with no late policy.`);
    // Shift name doesn't match any configured Master at all: calendar-day window and no
    // late policy (never Late unless a shift explicitly configures one).
    return { start: "00:00", end: "00:00", lateLimit: null, buffers: [], latePolicy: [] };
  }

  const meta = shiftMaster.metadata || {};
  // Extract buffers from latePolicy if available, otherwise explicit buffers, otherwise
  // a single lateLimit. If NONE of these are actually configured, buffers stays [] -
  // meaning this shift has no late policy at all (calculateLateTier already treats an
  // empty buffers list as "never late", below) - instead of silently forcing every
  // employee onto a hardcoded 09:15 wall-clock cutoff that has nothing to do with this
  // shift's real hours (e.g. a flexible 12h rotation with no fixed arrival time, where
  // "late" isn't a meaningful concept - only whether the full shift got worked).
  let buffers = [];
  if (meta.latePolicy && Array.isArray(meta.latePolicy) && meta.latePolicy.length > 0) {
    buffers = meta.latePolicy.map(p => p.time).filter(t => t);
  } else if (Array.isArray(meta.buffers) && meta.buffers.length > 0) {
    buffers = meta.buffers;
  } else if (meta.lateLimit) {
    buffers = [meta.lateLimit];
  }

  // Hours: the master's saved start/end. Shifts created by name only (e.g. "Shift ->
  // 6:30 PM-4 AM") have none, so read them from the name; otherwise 00:00-00:00, i.e. a
  // plain calendar-day window rather than an invented 09:00-18:00 working day.
  let start = meta.startTime;
  let end = meta.endTime;
  if (!start || !end) {
    const fromName = parseShiftHoursFromName(shiftMaster.name);
    if (fromName) {
      start = start || fromName.start;
      end = end || fromName.end;
    } else {
      warnOnce(`Shift "${shiftMaster.name}" has no start/end time and none can be read from its name - using a plain calendar day.`);
    }
  }

  return {
    start: start || "00:00",
    end: end || "00:00",
    lateLimit: meta.lateLimit || null,
    latePolicy: meta.latePolicy || [],
    buffers
  };
};

export const calculateLateTier = (checkInTime, rules) => {
  if (!checkInTime) return 0;

  // Overnight shifts (e.g. "Flexible" start 05:00) can have late-policy tiers that
  // land after midnight - "Flexible"'s tiers are 13:15 -> 13:30 -> 02:00 (next day,
  // the harshest tier). Sorting those as plain minutes-of-day puts "02:00" (120) FIRST
  // since it's numerically smallest, even though it's chronologically LAST relative to
  // the shift's own start - making 02:00 the on-time cutoff instead of 13:15 and
  // pushing every legitimately-on-time check-in into "Late". Normalize any time earlier
  // than the shift's start into "next day" space before comparing. No-op for same-day
  // shifts, where every buffer is already >= start.
  const shiftStartMin = toMinutes(rules.start);
  const normalize = (t) => {
    const m = toMinutes(t);
    return m < shiftStartMin ? m + 24 * 60 : m;
  };
  const checkInMin = normalize(checkInTime);

  // Ensure we have at least one buffer
  const buffers = rules.buffers || [rules.lateLimit];
  if (buffers.length === 0) return 0;

  // Convert all buffers to minutes
  const bufferMins = buffers.map(normalize).sort((a, b) => a - b);

  if (checkInMin <= bufferMins[0]) return 0; // On Time

  if (bufferMins.length === 1) return 1; // Only 1 buffer defined, so simple Late

  if (checkInMin <= bufferMins[1]) return 1; // Between Buf1 and Buf2
  if (bufferMins.length === 2) return 2; // > Buf2, limit reached

  if (checkInMin <= bufferMins[2]) return 2; // Between Buf2 and Buf3

  return 3; // > Buf3
};

// Builds a Set of "YYYY-MM-DD" strings from a SystemSettings.holidays array. Pulled out
// as a pure function (no DB call) so payrollController can reuse it against a
// `settings` object it already fetched, instead of re-deriving this Set with its own
// copy of the date-matching logic.
//
// Uses getUTC* getters, not local-timezone getters. holidays[].date is a bare
// "YYYY-MM-DD" from a <input type="date">, which the JS Date parser reads as UTC
// midnight - reading it back with local getters is only correct if the server
// process's OS timezone happens to be UTC-or-later-same-day, and silently mislabels
// the holiday by one day otherwise. This is NOT the same situation as real biometric
// punch timestamps elsewhere in this codebase (see biometricSyncService.js's
// parseBioCloudTimestamp / this file's own UAE +4h anchor for those) - those are true
// moments-in-time that need a +4h shift to land on the correct UAE calendar day. A
// holiday date is already normalized to UTC midnight with no "real" time-of-day
// component, so a plain UTC read is both correct and simpler - do not add a +4h shift
// here, that would incorrectly push it a day in the other direction.
export const holidaySetFromHolidays = (holidays = []) => {
  const holidaySet = new Set();
  holidays.forEach(h => {
    if (h.date) {
      const d = new Date(h.date);
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(d.getUTCDate()).padStart(2, '0');
      holidaySet.add(`${yyyy}-${mm}-${dd}`);
    }
  });
  return holidaySet;
};

// Helper: Get Holidays Set
export const getHolidaysSet = async () => {
  const settings = await SystemSettings.findOne();
  return holidaySetFromHolidays(settings?.holidays || []);
};

// True if `dateObj` falls on one of the given employee's recurring weekly off-days,
// under their Working Day Type (see employeeModel.js for the 0/2/4/8 meanings).
// `systemDefault` is the company-wide fallback shape { workingDayType, weekOffDays }
// (typically SystemSettings' defaultWorkingDayType/defaultWeekOffDays), used only when
// the employee has no explicit value of their own.
//
// Type 0 (no days off) and type 2 (flexible monthly allowance, not tied to any
// weekday) both always return false here - neither is a "this specific calendar day
// is structurally off" fact. Type 2's allowance is handled separately, after the
// per-day loop, by applyMonthlyFlexQuota() below - it can't be decided per-day in
// isolation since it's a monthly budget, not a fixed pattern.
export const isWeekOff = (dateObj, employee, systemDefault = {}) => {
  const type = employee?.workingDayType ?? systemDefault?.workingDayType ?? 4;
  if (type === 0 || type === 2) return false;

  const days = (employee?.weekOffDays && employee.weekOffDays.length)
    ? employee.weekOffDays
    : ((systemDefault?.weekOffDays && systemDefault.weekOffDays.length) ? systemDefault.weekOffDays : [0]);
  return days.includes(dateObj.getDay());
};

// For workingDayType===2 (flexible monthly allowance): walks a period's day-by-day
// status array in date order and converts up to `quotaDays` of the FIRST plain
// "ABSENT" days (no attendance record, not on leave, not a holiday - i.e. genuinely
// unaccounted-for days) into "FLEX_OFF" - a paid status, excluded from the
// deduction basis, same treatment as WEEKEND/HOLIDAY. This is deliberately
// first-come-first-served: the employee doesn't need to file a leave request for
// these, the system just doesn't penalize their first N no-shows each period.
// `dayStatuses` entries are mutated in place; callers should already have them
// sorted chronologically (both attendanceController.js and payrollController.js
// build them in date order).
// `absentStatus`/`flexStatus` are configurable because payrollController.js and
// attendanceController.js use two different status-string casing conventions
// (upper-case 'ABSENT'/'FLEX_OFF' vs display Title-Case "Absent"/"Flex Off") - this
// helper stays agnostic to which one a given caller uses.
export const applyMonthlyFlexQuota = (dayStatuses, quotaDays, { absentStatus = "ABSENT", flexStatus = "FLEX_OFF" } = {}) => {
  if (!quotaDays || quotaDays <= 0) return dayStatuses;
  let remaining = quotaDays;
  for (const day of dayStatuses) {
    if (remaining <= 0) break;
    if (day.status === absentStatus) {
      day.status = flexStatus;
      remaining -= 1;
    }
  }
  return dayStatuses;
};

// Get Map of Approved Leaves for Multiple Employees
export const getApprovedLeavesMap = async (employees) => {
  const emailToEmpId = {};
  const emails = [];
  employees.forEach(emp => {
    if (emp.email) {
      emailToEmpId[emp.email] = emp._id.toString();
      emails.push(emp.email);
    }
  });

  const users = await User.find({ email: { $in: emails } });
  const userIdToEmpId = {};
  const userIds = [];
  users.forEach(u => {
    userIdToEmpId[u._id.toString()] = emailToEmpId[u.email];
    userIds.push(u._id);
  });

  const requests = await Request.find({
    userId: { $in: userIds },
    requestType: "LEAVE",
    status: "APPROVED"
  });

  const map = {}; // empId -> [{start, end}]
  requests.forEach(req => {
    const details = req.details || {};
    const startDate = details.startDate || details.fromDate;
    const endDate = details.endDate || details.toDate;

    if (startDate && endDate) {
      const empId = userIdToEmpId[req.userId.toString()];
      if (empId) {
        if (!map[empId]) map[empId] = [];
        const s = new Date(startDate);
        const e = new Date(endDate);
        s.setHours(0, 0, 0, 0);
        e.setHours(23, 59, 59, 999);
        map[empId].push({
          start: s,
          end: e,
          leaveType: details.leaveType || details.leaveTypeId || "Unpaid Leave"
        });
      }
    }
  });
  return map;
};

// Get Set of EmployeeIDs who are on APPROVED LEAVE for a specific date
export const getApprovedLeaves = async (date, employees) => {
  const onLeaveEmployeeIds = new Set();

  // 1. Map Employee Emails -> Employee IDs
  const emailToEmpId = {};
  const emails = [];
  employees.forEach(emp => {
    if (emp.email) {
      emailToEmpId[emp.email] = emp._id.toString();
      emails.push(emp.email);
    }
  });

  // 2. Find Users for these employees
  const users = await User.find({ email: { $in: emails } });
  const userIdToEmpId = {};
  const userIds = [];

  users.forEach(u => {
    userIdToEmpId[u._id.toString()] = emailToEmpId[u.email];
    userIds.push(u._id);
  });

  // 3. Find APPROVED LEAVE Requests for these users
  const requests = await Request.find({
    userId: { $in: userIds },
    requestType: "LEAVE",
    status: "APPROVED"
  });

  // 4. Check date overlap
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  requests.forEach(req => {
    if (req.details && req.details.startDate && req.details.endDate) {
      const start = new Date(req.details.startDate);
      const end = new Date(req.details.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      if (targetDate >= start && targetDate <= end) {
        const empId = userIdToEmpId[req.userId.toString()];
        if (empId) onLeaveEmployeeIds.add(empId);
      }
    }
  });

  return onLeaveEmployeeIds;
};

// Check if a date is within any leave range
export const isLeave = (empId, dateStr, map) => {
  const ranges = map[empId.toString()];
  if (!ranges) return false;
  const d = new Date(dateStr);
  d.setHours(12, 0, 0, 0); // Mid-day check
  for (const r of ranges) {
    if (d >= r.start && d <= r.end) return true;
  }
  return false;
};
