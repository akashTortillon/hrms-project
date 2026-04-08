/**
 * Payroll / attendance: per-employee weekly offs and planned working days in a calendar month.
 * weekdays: Date#getDay() — 0 Sun .. 6 Sat
 */

/** @param {unknown} n */
const isValidDay = (n) => Number.isInteger(n) && n >= 0 && n <= 6;

/**
 * Preset map for workingDayType when weeklyOffDays is absent.
 * 4 → Sundays; 8 → Sat+Sun; 0 → none; 2 → treat as Fri+Sat (common "two days") until client clarifies
 */
const PRESET_WEEKLY_OFF_BY_TYPE = {
  0: [],
  2: [5, 6], // Fri, Sat — configurable default for "two days off"
  4: [0],
  8: [6, 0],
};

/**
 * @param {{ weeklyOffDays?: number[] | null, workingDayType?: number | null }} employeeLike
 * @returns {Set<number>}
 */
export function getWeeklyOffDaySet(employeeLike) {
  const raw = employeeLike?.weeklyOffDays;
  if (Array.isArray(raw) && raw.length > 0) {
    const set = new Set();
    for (const d of raw) {
      if (isValidDay(d)) set.add(d);
    }
    if (set.size > 0) return set;
  }

  const t = employeeLike?.workingDayType;
  if (t !== null && t !== undefined && Object.prototype.hasOwnProperty.call(PRESET_WEEKLY_OFF_BY_TYPE, t)) {
    const arr = PRESET_WEEKLY_OFF_BY_TYPE[t];
    return new Set(arr);
  }

  // Legacy: Sunday-only (matches previous codebase default)
  return new Set([0]);
}

/**
 * @param {number} year
 * @param {number} month 1-12
 * @param {Set<number>} weeklyOffDaySet
 */
export function countWeeklyOffDaysInMonth(year, month, weeklyOffDaySet) {
  const daysInMonth = new Date(year, month, 0).getDate();
  let n = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const dow = new Date(year, month - 1, day).getDay();
    if (weeklyOffDaySet.has(dow)) n++;
  }
  return n;
}

/**
 * @param {string} ymd yyyy-mm-dd
 */
function parseYmdParts(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return null;
  return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) };
}

/**
 * Build holiday YMD keys for dates in [year, month] from settings.holidays
 * @param {number} year
 * @param {number} month 1-12
 * @param {{ holidays?: { date?: Date | string }[] } | null} settings
 * @returns {Set<string>}
 */
export function getHolidayYmdSetForMonth(year, month, settings) {
  const set = new Set();
  const holidays = settings?.holidays;
  if (!Array.isArray(holidays)) return set;

  const strMonth = String(month).padStart(2, "0");

  for (const h of holidays) {
    if (!h?.date) continue;
    const d = new Date(h.date);
    if (Number.isNaN(d.getTime())) continue;
    const y = d.getFullYear();
    const m0 = d.getMonth() + 1;
    if (y !== year || m0 !== month) continue;
    const dd = String(d.getDate()).padStart(2, "0");
    set.add(`${y}-${strMonth}-${dd}`);
  }
  return set;
}

/**
 * Holidays in month that fall on a day that is NOT the employee's weekly off
 */
export function countPublicHolidaysOnWorkingDays(year, month, holidayYmdSet, weeklyOffDaySet) {
  let n = 0;
  for (const ymd of holidayYmdSet) {
    const parts = parseYmdParts(ymd);
    if (!parts) continue;
    const dow = new Date(parts.y, parts.mo - 1, parts.d).getDay();
    if (!weeklyOffDaySet.has(dow)) n++;
  }
  return n;
}

/**
 * @param {number} year
 * @param {number} month 1-12
 * @param {Set<number>} weeklyOffDaySet
 * @param {{ holidays?: { date?: Date | string }[] } | null} settings
 * @returns {{ daysInMonth: number, weeklyOffCount: number, holidayOnWorkingDayCount: number, plannedWorkingDays: number }}
 */
export function getPlannedWorkingDaysBreakdown(year, month, weeklyOffDaySet, settings) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const weeklyOffCount = countWeeklyOffDaysInMonth(year, month, weeklyOffDaySet);
  const holidayYmdSet = getHolidayYmdSetForMonth(year, month, settings);
  const holidayOnWorkingDayCount = countPublicHolidaysOnWorkingDays(
    year,
    month,
    holidayYmdSet,
    weeklyOffDaySet
  );
  const plannedWorkingDays = Math.max(
    1,
    daysInMonth - weeklyOffCount - holidayOnWorkingDayCount
  );
  return {
    daysInMonth,
    weeklyOffCount,
    holidayOnWorkingDayCount,
    plannedWorkingDays,
  };
}

/**
 * @param {number} year
 * @param {number} month 1-12
 * @param {{ weeklyOffDays?: number[] | null, workingDayType?: number | null }} employeeLike
 * @param {{ holidays?: { date?: Date | string }[] } | null} settings
 */
export function getPlannedWorkingDaysForEmployee(year, month, employeeLike, settings) {
  const set = getWeeklyOffDaySet(employeeLike);
  return getPlannedWorkingDaysBreakdown(year, month, set, settings);
}

/**
 * @param {string} ymd yyyy-mm-dd
 * @param {Set<number>} weeklyOffDaySet
 */
export function isWeeklyOffDate(ymd, weeklyOffDaySet) {
  const parts = parseYmdParts(ymd);
  if (!parts) return false;
  const dow = new Date(parts.y, parts.mo - 1, parts.d).getDay();
  return weeklyOffDaySet.has(dow);
}
