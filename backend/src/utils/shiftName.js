// Shifts are tied to employees by NAME (Employee.shift is the shift master's name), and the
// names are long hand-written labels like "Flex-Shift -> 1 PM-4 PM & 7 PM-4 AM". The same
// shift gets typed slightly differently in different places ("1 PM - 4 PM", "4AM" vs
// "4 AM"), and an exact comparison then treats it as a different, unknown shift - the
// employee dropdown shows nothing selected and attendance silently loses the shift's hours.
// These helpers compare names by a whitespace/case-insensitive key instead.

// "Flex-Shift -> 1 PM - 4 PM & 7 PM - 4AM"  ->  "flex-shift->1pm-4pm&7pm-4am"
export const shiftKey = (name) => String(name ?? "").toLowerCase().replace(/\s+/g, "");

// Finds the master whose name equals `name` exactly, else the one with the same key.
// `masters` is a list of { name, ... }. Returns the master or null.
export const findShiftByName = (masters, name) => {
  const list = masters || [];
  const exact = list.find((m) => m.name === name);
  if (exact) return exact;
  const key = shiftKey(name);
  if (!key) return null;
  return list.find((m) => shiftKey(m.name) === key) || null;
};

// Canonical (exact master) spelling for `name`, or the original text when nothing matches.
export const canonicalShiftName = (masters, name) => findShiftByName(masters, name)?.name ?? name;

const TIME = /(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/gi;

const to24h = (hour, minute, meridiem) => {
  let h = Number(hour) % 12;
  if (meridiem.toUpperCase() === "PM") h += 12;
  return `${String(h).padStart(2, "0")}:${String(Number(minute || 0)).padStart(2, "0")}`;
};

// Reads the working hours out of a shift's name when the master has no start/end saved:
//   "Shift -> 6:30 PM-4 AM"                      -> { start: "18:30", end: "04:00" }
//   "Flex-Shift -> 1 PM-4 PM & 7 PM-4 AM"         -> { start: "13:00", end: "04:00" }
// A split shift runs from its first time to its last. Returns null if the name has no times.
export const parseShiftHoursFromName = (name) => {
  const times = [...String(name ?? "").matchAll(TIME)].map((m) => to24h(m[1], m[2], m[3]));
  if (times.length < 2) return null;
  return { start: times[0], end: times[times.length - 1] };
};
