const pad = (n) => String(n).padStart(2, "0");

// The "22nd to 22nd" attendance cycle that ENDS in the given month: previous month's
// `day` through this month's `day` (e.g. month 10/2026 -> 2026-09-22 .. 2026-10-22).
export const buildCycleRange = (month, year, day = 22) => {
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  return {
    from: `${prevYear}-${pad(prevMonth)}-${pad(day)}`,
    to: `${year}-${pad(month)}-${pad(day)}`
  };
};

// Every YYYY-MM-DD from `from` to `to` inclusive (UTC arithmetic - no DST drift).
export const enumerateDays = (from, to) => {
  const days = [];
  const end = new Date(`${to}T00:00:00Z`);
  for (let d = new Date(`${from}T00:00:00Z`); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
};

// Days for a calendar month as YYYY-MM-DD.
export const monthDays = (month, year) => {
  const count = new Date(year, month, 0).getDate();
  return Array.from({ length: count }, (_, i) => `${year}-${pad(month)}-${pad(i + 1)}`);
};
