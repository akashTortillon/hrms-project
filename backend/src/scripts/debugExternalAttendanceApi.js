import dotenv from "dotenv";
dotenv.config();

import {
  externalHealthCheck,
  fetchAttendancePage
} from "../services/externalAttendanceApi.js";

function toTimeZoneParts(isoTimestamp, timeZone) {
  const d = new Date(isoTimestamp);
  if (Number.isNaN(d.getTime())) return null;

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });

  const parts = formatter.formatToParts(d);
  const get = (type) => parts.find((p) => p.type === type)?.value;

  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = get("hour");
  const minute = get("minute");
  const second = get("second");

  if (!year || !month || !day || !hour || !minute || !second) return null;

  return {
    date: `${year}-${month}-${day}`, // YYYY-MM-DD
    time: `${hour}:${minute}:${second}` // HH:MM:SS
  };
}

function pickCheckInOutForDate(records, { timeZone, targetDate }) {
  const punches = [];

  for (const r of records || []) {
    const parts = toTimeZoneParts(r?.authDateTime, timeZone);
    if (!parts) continue;
    if (parts.date !== targetDate) continue;
    punches.push({
      employeeID: r.employeeID,
      direction: r.direction,
      authDateTime: r.authDateTime,
      localTime: parts.time,
      SLNO: r.SLNO
    });
  }

  const ins = punches.filter((p) => p.direction === "IN").map((p) => p.localTime);
  const outs = punches.filter((p) => p.direction === "OUT").map((p) => p.localTime);

  const checkIn = ins.length ? ins.sort()[0].slice(0, 5) : null;
  const checkOut = outs.length ? outs.sort()[outs.length - 1].slice(0, 5) : null;

  return { punches, checkIn, checkOut };
}

async function main() {
  const employeeId = process.env.DEBUG_EMPLOYEE_ID || "10172";
  const targetDate = process.env.DEBUG_DATE || "2026-04-06";
  const timeZone = process.env.DEBUG_TIMEZONE || "Asia/Dubai";

  console.log("Debug External Attendance API (employee/day)");
  console.log("Employee:", employeeId);
  console.log("Date:", targetDate);
  console.log("Timezone:", timeZone);

  const health = await externalHealthCheck();
  console.log("HealthCheck:", String(health).slice(0, 200));

  // Use paginated endpoint and filter client-side for this employee/day.
  // (The public docs also provide /api/attendance/employee/:id, but it's not implemented here to avoid expanding API surface.)
  const limit = 5000;
  let page = 1;
  let totalPages = 1;
  const matched = [];

  while (page <= totalPages) {
    const resp = await fetchAttendancePage({ page, limit });
    totalPages = Number(resp?.totalPages || totalPages);
    const data = Array.isArray(resp?.data) ? resp.data : [];
    for (const r of data) {
      if (String(r?.employeeID) === String(employeeId)) matched.push(r);
    }
    page += 1;
    if (data.length === 0) break;
  }

  console.log(`Total records for employee ${employeeId}:`, matched.length);

  const { punches, checkIn, checkOut } = pickCheckInOutForDate(matched, {
    timeZone,
    targetDate
  });

  console.log(`Punches on ${targetDate}:`, punches.length);
  console.log(
    punches
      .sort((a, b) => String(a.authDateTime).localeCompare(String(b.authDateTime)))
      .slice(0, 50)
  );
  console.log("Derived checkIn:", checkIn || "-");
  console.log("Derived checkOut:", checkOut || "-");
}

main().catch((e) => {
  console.error("Debug script failed:", e?.message || e);
  process.exit(1);
});

