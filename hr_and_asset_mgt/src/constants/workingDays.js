/** Match backend `workingDaysHelper.js` presets (JS weekday: 0 Sun .. 6 Sat) */
export const WORKING_DAY_TYPE_PRESETS = {
  0: [],
  2: [5, 6],
  4: [0],
  8: [6, 0],
};

export const WORKING_DAY_TYPE_OPTIONS = [
  { value: 0, label: "0 Days — no fixed weekly off" },
  { value: 2, label: "2 Days — Fri & Sat (adjust below if needed)" },
  { value: 4, label: "4 pattern — weekly off Sundays" },
  { value: 8, label: "8 pattern — Saturday & Sunday" },
];

/** Labels for checkboxes (Mon-first order for UX) */
export const WEEKDAY_CHECKBOXES = [
  { day: 1, label: "Mon" },
  { day: 2, label: "Tue" },
  { day: 3, label: "Wed" },
  { day: 4, label: "Thu" },
  { day: 5, label: "Fri" },
  { day: 6, label: "Sat" },
  { day: 0, label: "Sun" },
];

export function displayWeeklyOffDays(employeeLike) {
  const raw = employeeLike?.weeklyOffDays;
  if (Array.isArray(raw) && raw.length > 0) {
    return [...new Set(raw.filter((n) => n >= 0 && n <= 6))].sort((a, b) => a - b);
  }
  const t = employeeLike?.workingDayType ?? 4;
  return [...(WORKING_DAY_TYPE_PRESETS[t] ?? WORKING_DAY_TYPE_PRESETS[4])];
}
