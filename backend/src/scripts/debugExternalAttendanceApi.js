import dotenv from "dotenv";
dotenv.config();

import {
  externalHealthCheck,
  fetchAttendancePage,
  fetchAttendanceSince
} from "../services/externalAttendanceApi.js";

async function main() {
  console.log("Debug External Attendance API");

  const health = await externalHealthCheck();
  console.log("HealthCheck:", String(health).slice(0, 200));

  const page1 = await fetchAttendancePage({ page: 1, limit: 5 });
  console.log("Page1 keys:", Object.keys(page1 || {}));
  console.log("Page1 sample:", (page1?.data || []).slice(0, 2));

  const now = new Date();
  now.setMinutes(now.getMinutes() - 5);
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = String(now.getFullYear());
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const from = `${dd}-${mm}-${yyyy} ${hh}:${min}:${ss}`;

  const since = await fetchAttendanceSince({ from });
  console.log("Since from:", from);
  console.log("Since keys:", Object.keys(since || {}));
  console.log("Since sample:", (since?.data || []).slice(0, 2));
}

main().catch((e) => {
  console.error("Debug script failed:", e?.message || e);
  process.exit(1);
});

