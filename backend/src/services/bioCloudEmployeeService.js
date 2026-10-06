import Employee from "../models/employeeModel.js";

// Pushes HRMS employees into the BioCloud biometric system so they exist there (and on the
// devices) without anyone re-typing them. Uses the same BIOCLOUD_API_URL / BIOCLOUD_API_TOKEN
// as biometricSyncService.js.
//
// Flow per employee (BioCloud API doc):
//   1. POST api_saveemployee       - add/update the employee by BadgeNumber (only BadgeNumber
//                                    is required; the call is an upsert so re-running is safe)
//   2. POST api_addemployeearea    - export the employee to every device in an area, if
//                                    BIOCLOUD_DEFAULT_AREA is set
//      POST api_addemployeedevice  - export to specific devices, if BIOCLOUD_DEVICE_SERIALS
//                                    (comma separated) is set
// Steps 2 queue device commands (returned as commandIds); the device runs them the next time
// it polls, so "Success" here means "queued", not "already on the device".
//
// Nothing here ever throws into the caller: BioCloud being down or unconfigured must not stop
// an employee from being created. The outcome is stored on employee.biometricSync instead, so
// failures can be found and retried (see scripts/syncEmployeesToBiometric.js).

const REQUEST_TIMEOUT_MS = 10000;

const isConfigured = () => !!(process.env.BIOCLOUD_API_URL && process.env.BIOCLOUD_API_TOKEN);

// BioCloud answers HTTP 400 with { result: "Error", <field>: "<reason>" } for validation
// problems, so the reason is pulled from whichever field carries it.
const describeBioCloudError = (data, status) => {
  if (!data || typeof data !== "object") return `HTTP ${status}`;
  const reasons = Object.entries(data)
    .filter(([key]) => key !== "result")
    .map(([key, value]) => `${key}: ${typeof value === "string" ? value.trim() : JSON.stringify(value)}`);
  return reasons.length ? reasons.join("; ") : `HTTP ${status}`;
};

const callBioCloud = async (endpoint, body) => {
  const response = await fetch(`${process.env.BIOCLOUD_API_URL}/${endpoint}`, {
    method: "POST",
    headers: { token: process.env.BIOCLOUD_API_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });

  // An unauthorised request comes back as 203 with no JSON result (per the API doc).
  if (response.status === 203) {
    throw new Error("BioCloud rejected the token (HTTP 203 Non-Authoritative Information). Check BIOCLOUD_API_TOKEN.");
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    // fall through - handled below
  }

  if (!response.ok || !data || data.result !== "Success") {
    throw new Error(`${endpoint} failed: ${describeBioCloudError(data, response.status)}`);
  }
  return data;
};

// BioCloud identifies an employee by BadgeNumber, which is what the punches come back with
// and what attendanceProcessor matches on (badgeNumber, falling back to code).
export const getBadgeNumber = (employee) => String(employee.badgeNumber || employee.code || "").trim();

const configuredDeviceSerials = () =>
  (process.env.BIOCLOUD_DEVICE_SERIALS || "").split(",").map((s) => s.trim()).filter(Boolean);

// Explains an error from callBioCloud/fetch. fetch() reports network problems as a bare
// "fetch failed"; the real reason (ECONNREFUSED, ENOTFOUND, ...) is on error.cause.
const describeError = (error) => {
  const causeDetail = error.cause?.code || error.cause?.errors?.[0]?.code || error.cause?.message;
  return `${error.message}${causeDetail ? ` (${causeDetail})` : ""}`;
};

/**
 * Adds/updates one employee in BioCloud and queues them onto their devices.
 * Always resolves with { status, message, commandIds } - never throws.
 *
 * Devices: the employee's own `biometricDevices` (serial numbers) are used. Only when they
 * have none does it fall back to BIOCLOUD_DEFAULT_AREA / BIOCLOUD_DEVICE_SERIALS from .env.
 * Pass `{ devices: [...] }` to push to exactly those serials instead (used when an edit adds
 * a device - nothing is ever removed from a device automatically, that deletes the
 * employee's enrolled biometrics there). Each device is tried on its own, so one wrong
 * serial doesn't stop the others.
 */
export const syncEmployeeToBiometric = async (employee, { devices } = {}) => {
  const badge = getBadgeNumber(employee);
  let result;

  if (!isConfigured()) {
    result = { status: "SKIPPED", message: "BIOCLOUD_API_URL / BIOCLOUD_API_TOKEN not set", commandIds: [] };
  } else if (!badge) {
    result = { status: "FAILED", message: "Employee has no badge number or code", commandIds: [] };
  } else {
    try {
      const payload = { BadgeNumber: badge, Name: employee.name || "" };
      // BioCloud files an employee under its first department when departmentName is missing
      // or unknown, so these are sent only when HRMS actually has a value.
      if (employee.department) payload.departmentName = employee.department;
      if (employee.designation) payload.positionName = employee.designation;
      await callBioCloud("api_saveemployee", payload);

      const clean = (list) => [...new Set((list || []).map((x) => String(x).trim()).filter(Boolean))];
      const ownDevices = clean(employee.biometricDevices);
      const explicit = Array.isArray(devices);
      const useFallback = !explicit && ownDevices.length === 0;
      const serials = explicit ? clean(devices) : useFallback ? configuredDeviceSerials() : ownDevices;
      const area = useFallback ? (process.env.BIOCLOUD_DEFAULT_AREA || "").trim() : "";

      const commandIds = [];
      const failures = [];
      const attempt = async (label, endpoint, body) => {
        try {
          const data = await callBioCloud(endpoint, body);
          commandIds.push(...[].concat(data.commandId || []));
        } catch (error) {
          failures.push(`${label}: ${describeError(error)}`);
        }
      };

      if (area) await attempt(`area "${area}"`, "api_addemployeearea", { BadgeNumber: badge, AreaName: area });
      for (const serial of serials) {
        await attempt(`device ${serial}`, "api_addemployeedevice", { BadgeNumber: badge, DeviceSerialNumber: serial });
      }

      if (failures.length) {
        result = { status: "FAILED", message: `Saved in BioCloud as badge ${badge}, but not everything was pushed - ${failures.join("; ")}`, commandIds };
      } else {
        const pushedNothing = !area && serials.length === 0 && !explicit;
        const note = pushedNothing ? " (not pushed to any device - pick a device for the employee, or set BIOCLOUD_DEFAULT_AREA / BIOCLOUD_DEVICE_SERIALS)" : "";
        const where = serials.length ? ` and queued to ${serials.join(", ")}` : "";
        result = { status: "SYNCED", message: `Saved in BioCloud as badge ${badge}${where}${note}`, commandIds };
      }
    } catch (error) {
      result = { status: "FAILED", message: describeError(error), commandIds: [] };
    }
  }

  try {
    await Employee.updateOne(
      { _id: employee._id },
      {
        $set: {
          biometricSync: {
            status: result.status,
            message: result.message,
            commandIds: result.commandIds,
            syncedAt: new Date()
          }
        }
      }
    );
  } catch (dbError) {
    console.error(`[BioCloudEmployee] Could not store sync status for ${badge}:`, dbError.message);
  }

  const log = result.status === "FAILED" ? console.warn : console.log;
  log(`[BioCloudEmployee] ${badge || employee._id}: ${result.status} - ${result.message}`);
  return result;
};

/**
 * Syncs many employees one after another (BioCloud is a small on-prem box, so no
 * parallel hammering). Used after an Excel import, after the HTTP response has been sent.
 */
export const syncEmployeesToBiometric = async (employeeIds) => {
  const summary = { SYNCED: 0, FAILED: 0, SKIPPED: 0 };
  for (const id of employeeIds) {
    const employee = await Employee.findById(id).lean();
    if (!employee) continue;
    const { status } = await syncEmployeeToBiometric(employee);
    summary[status] = (summary[status] || 0) + 1;
  }
  console.log(`[BioCloudEmployee] Batch done - synced ${summary.SYNCED}, failed ${summary.FAILED}, skipped ${summary.SKIPPED}`);
  return summary;
};
