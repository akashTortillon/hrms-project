// Same whitespace/case-insensitive comparison key the backend uses (backend/src/utils/shiftName.js):
// "Flex-Shift -> 1 PM - 4 PM & 7 PM - 4AM" and "Flex-Shift -> 1 PM-4 PM & 7 PM-4 AM" are the
// same shift typed two ways.
export const shiftKey = (name) => String(name ?? "").toLowerCase().replace(/\s+/g, "");

// The master whose name equals `name` exactly, else the one with the same key.
export const findShiftByName = (shifts, name) =>
  (shifts || []).find((s) => s.name === name) ||
  (shiftKey(name) ? (shifts || []).find((s) => shiftKey(s.name) === shiftKey(name)) : undefined) ||
  null;
