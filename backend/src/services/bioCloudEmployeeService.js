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

/**
 * Adds/updates one employee in BioCloud and queues them onto the configured area/devices.
 * Always resolves with { status, message, commandIds } - never throws.
 */
export const syncEmployeeToBiometric = async (employee) => {
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

      const commandIds = [];
      const area = (process.env.BIOCLOUD_DEFAULT_AREA || "").trim();
      if (area) {
        const data = await callBioCloud("api_addemployeearea", { BadgeNumber: badge, AreaName: area });
        commandIds.push(...[].concat(data.commandId || []));
      }
      for (const serial of configuredDeviceSerials()) {
        const data = await callBioCloud("api_addemployeedevice", { BadgeNumber: badge, DeviceSerialNumber: serial });
        commandIds.push(...[].concat(data.commandId || []));
      }

      const pushedTo = area || configuredDeviceSerials().length ? "" : " (not pushed to any device - set BIOCLOUD_DEFAULT_AREA or BIOCLOUD_DEVICE_SERIALS)";
      result = { status: "SYNCED", message: `Saved in BioCloud as badge ${badge}${pushedTo}`, commandIds };
    } catch (error) {
      // fetch() reports network problems as a bare "fetch failed"; the real reason
      // (ECONNREFUSED, ENOTFOUND, ...) is on error.cause.
      const causeDetail = error.cause?.code || error.cause?.errors?.[0]?.code || error.cause?.message;
      const cause = causeDetail ? ` (${causeDetail})` : "";
      result = { status: "FAILED", message: `${error.message}${cause}`, commandIds: [] };
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
