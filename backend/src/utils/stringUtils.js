// Escapes regex special characters so a value can be safely interpolated into a
// `new RegExp(...)` pattern for an exact (optionally case-insensitive) string
// match - e.g. `new RegExp(`^${escapeRegex(name)}$`, "i")`. Was previously
// copy-pasted independently in payrollController.js, requestController.js, and
// employeeDocumentController.js; consolidated here as the single source so a fix
// (or a new caller, e.g. attendanceUtils.js's Shift Master lookup) doesn't drift.
export const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
