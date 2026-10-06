// Helpers for linking employees to BioCloud devices by serial number.
// Devices live in Masters (type BIOMETRIC_DEVICE): `name` is a label, `code` is the serial.

// Trims, drops blanks and duplicates. Accepts an array or a comma/semicolon separated string.
export const normalizeSerials = (value) => {
  const list = Array.isArray(value) ? value : String(value ?? "").split(/[,;]/);
  return [...new Set(list.map((x) => String(x ?? "").trim()).filter(Boolean))];
};

// Lowercased device name AND serial -> canonical serial, so a sheet can use either.
export const buildDeviceLookup = (deviceMasters) => {
  const lookup = new Map();
  for (const device of deviceMasters || []) {
    const serial = String(device.code || "").trim();
    if (!serial) continue;
    lookup.set(serial.toLowerCase(), serial);
    if (device.name) lookup.set(String(device.name).trim().toLowerCase(), serial);
  }
  return lookup;
};

// Resolves an Excel "Device" cell (one or several names/serials separated by , or ;).
// Returns { serials, unknown }: serials are canonical and de-duplicated, unknown are the
// values that matched no device in Masters.
export const parseDeviceCell = (cell, lookup) => {
  const serials = [];
  const unknown = [];
  for (const token of normalizeSerials(cell)) {
    const serial = lookup.get(token.toLowerCase());
    if (!serial) unknown.push(token);
    else if (!serials.includes(serial)) serials.push(serial);
  }
  return { serials, unknown };
};
