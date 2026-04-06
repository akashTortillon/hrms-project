import Attendance from "../models/attendanceModel.js";
import Employee from "../models/employeeModel.js";

/**
 * Convert external attendance record into internal punch log.
 * External fields: employeeID, authDateTime, direction, uid, SLNO
 */
export function toPunchLog(externalRecord) {
  const employeeCode = externalRecord?.employeeID;
  const timestamp = externalRecord?.authDateTime;
  const type = externalRecord?.direction;

  return {
    employeeCode,
    timestamp,
    type,
    uidOrSlno: Number(externalRecord?.SLNO ?? externalRecord?.uid ?? NaN)
  };
}

export function formatSinceFrom(date) {
  const d = new Date(date);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${dd}-${mm}-${yyyy} ${hh}:${min}:${ss}`;
}

export function compareCursor(a, b) {
  const aTime = a?.authDateTime ? new Date(a.authDateTime).getTime() : 0;
  const bTime = b?.authDateTime ? new Date(b.authDateTime).getTime() : 0;
  if (aTime !== bTime) return aTime - bTime;
  const aTie = Number(a?.uidOrSlno ?? -1);
  const bTie = Number(b?.uidOrSlno ?? -1);
  return aTie - bTie;
}

/**
 * Groups punch logs into daily rollups.
 * Input punch: { employeeCode, timestamp (ISO), type: IN|OUT }
 */
export function groupPunchesToDaily(punches) {
  const groupedData = {};
  const employeeCodes = new Set();

  for (const punch of punches) {
    if (!punch?.employeeCode || !punch?.timestamp || !punch?.type) continue;

    const [date, timeFull] = String(punch.timestamp).split("T");
    if (!date || !timeFull) continue;
    const time = timeFull.substring(0, 5); // HH:MM
    const key = `${punch.employeeCode}_${date}`;

    employeeCodes.add(punch.employeeCode);

    if (!groupedData[key]) {
      groupedData[key] = {
        employeeCode: punch.employeeCode,
        date,
        checkIn: null,
        checkOut: null
      };
    }

    if (punch.type === "IN") {
      if (!groupedData[key].checkIn || time < groupedData[key].checkIn) {
        groupedData[key].checkIn = time;
      }
    } else if (punch.type === "OUT") {
      if (!groupedData[key].checkOut || time > groupedData[key].checkOut) {
        groupedData[key].checkOut = time;
      }
    }
  }

  return { groupedData, employeeCodes: Array.from(employeeCodes) };
}

/**
 * Upserts grouped daily attendance with protections:
 * - Skip if employee is on approved leave for that date (caller provides leaveMap + isLeave)
 * - Skip if existing record status is "On Leave"
 * - Skip if existing record isManuallyEdited === true
 */
export async function upsertGroupedAttendance({
  groupedData,
  employeesList,
  leaveMap,
  isLeave,
  getShiftRules,
  calculateLateTier,
  calculateDuration
}) {
  let upserted = 0;
  let skippedLeave = 0;
  let skippedManual = 0;
  let skippedOnLeaveStatus = 0;
  const errors = [];

  const employeeIndex = buildEmployeeExternalIndex(employeesList);

  for (const key of Object.keys(groupedData)) {
    const record = groupedData[key];
    const employee = employeeIndex.get(String(record.employeeCode));

    if (!employee) {
      errors.push(`Employee not found: ${record.employeeCode}`);
      continue;
    }

    if (isLeave(employee._id, record.date, leaveMap)) {
      skippedLeave++;
      continue;
    }

    const existingRecord = await Attendance.findOne({
      employee: employee._id,
      date: record.date
    });

    if (existingRecord?.status === "On Leave") {
      skippedOnLeaveStatus++;
      continue;
    }

    if (existingRecord?.isManuallyEdited === true) {
      skippedManual++;
      continue;
    }

    const shiftName = employee.shift || "Day Shift";
    const rules = await getShiftRules(shiftName);

    let status = "Absent";
    let lateTier = 0;
    if (record.checkIn) {
      lateTier = calculateLateTier(record.checkIn, rules);
      status = lateTier > 0 ? "Late" : "Present";
    }

    const workHours = calculateDuration(record.checkIn, record.checkOut);

    await Attendance.findOneAndUpdate(
      { employee: employee._id, date: record.date },
      {
        employee: employee._id,
        date: record.date,
        shift: shiftName,
        checkIn: record.checkIn,
        checkOut: record.checkOut,
        status,
        lateTier,
        workHours
      },
      { upsert: true, new: true }
    );

    upserted++;
  }

  return {
    upserted,
    skippedLeave,
    skippedManual,
    skippedOnLeaveStatus,
    errors
  };
}

export function buildEmployeeExternalIndex(employees) {
  const idx = new Map();
  for (const emp of employees || []) {
    if (!emp) continue;
    if (emp.code) idx.set(String(emp.code), emp);
    if (emp.agentId) idx.set(String(emp.agentId), emp);
    if (emp.personalId) idx.set(String(emp.personalId), emp);
    if (emp.laborCardNumber) idx.set(String(emp.laborCardNumber), emp);
  }
  return idx;
}

export async function fetchEmployeesByExternalIds(externalIds) {
  if (!externalIds?.length) return [];
  const ids = externalIds.map((x) => String(x));

  return await Employee.find({
    $or: [
      { code: { $in: ids } },
      { agentId: { $in: ids } },
      { personalId: { $in: ids } },
      { laborCardNumber: { $in: ids } }
    ]
  });
}

