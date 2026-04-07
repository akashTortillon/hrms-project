// backend/src/scripts/convertEmployeeMasterToImportTemplate.js
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

/**
 * Converts the exported "Employee Master" CSV (with repeated header blocks and quoted newlines)
 * into a clean upload-ready Excel matching `importEmployees` template headers.
 *
 * Usage (from repo root):
 *   node backend/src/scripts/convertEmployeeMasterToImportTemplate.js
 *
 * Optional env vars:
 *   INPUT=backend/src/EMPLOYEE MASTER-UPDATED - Employee Master.csv
 *   OUT_XLSX=backend/src/Employee_Import_Ready.xlsx
 *   OUT_ISSUES=backend/src/Employee_Import_Issues.csv
 */

const INPUT =
  process.env.INPUT || "backend/src/EMPLOYEE MASTER-UPDATED - Employee Master.csv";
const OUT_XLSX = process.env.OUT_XLSX || "backend/src/Employee_Import_Ready.xlsx";
const OUT_ISSUES =
  process.env.OUT_ISSUES || "backend/src/Employee_Import_Issues.csv";

const IMPORT_HEADERS = [
  "Employee ID",
  "Full Name",
  "Email",
  "Phone",
  "Role",
  "Department",
  "Branch",
  "Designation",
  "Employee Type",
  "Joining Date",
  "Status",
  "Shift",
  "Nationality",
  "UAE Address",
  "Basic Salary",
  "Accommodation",
  "Labor Card No",
  "Personal ID (14 Digit)",
  "Bank Name",
  "IBAN",
  "Account Number",
  "Agent ID (WPS)",
  "Passport Expiry",
  "Emirates ID Expiry",
  "Visa Expiry",
];

const SOURCE_TO_TARGET = {
  // Required mapping
  FULL_NAME: "Full Name",
  EMAIL: "Email",
  PHONE: "Phone",
  DEPARTMENT: "Department",
  ROLE: "Role",
  BRANCH: "Branch",
  JOINING_DATE: "Joining Date",
  STATUS: "Status",
  DESIGNATION: "Designation",
  NATIONALITY: "Nationality",
  // Optional/unknown from source sheet; left blank by default:
  // EMPLOYEE_TYPE, SHIFT, UAE_ADDRESS, BASIC_SALARY, ACCOMMODATION, etc.
};

function parseCsvWithQuotedNewlines(text) {
  // Minimal RFC4180-ish parser: supports quotes, escaped quotes, commas, CRLF/LF,
  // and preserves newlines inside quoted fields.
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        const next = text[i + 1];
        if (next === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      continue;
    }

    if (c === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (c === "\r") {
      if (text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
      continue;
    }

    if (c === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
      continue;
    }

    field += c;
  }

  row.push(field);
  rows.push(row);
  return rows;
}

function norm(val) {
  if (val == null) return "";
  const s = String(val).replace(/\u00a0/g, " ").trim();
  const upper = s.toUpperCase();
  if (upper === "NA" || upper === "#VALUE!" || upper === "N/A") return "";
  return s;
}

function normalizePhone(raw) {
  const s = norm(raw);
  if (!s) return "";

  // Keep digits only for normalization decisions.
  const keepPlus = s.startsWith("+");
  const digits = s.replace(/[^\d]/g, "");
  if (!digits) return "";

  // User model enforces: /^\+971\d{7,12}$/ (must start with +971).
  // Normalize common UAE variants into +971xxxxxxxxx.
  if (keepPlus && digits.startsWith("971")) {
    return `+${digits}`;
  }

  // 00971xxxxxxxxx
  if (digits.startsWith("00971")) {
    return `+${digits.slice(2)}`;
  }

  // 971xxxxxxxxx
  if (digits.startsWith("971")) {
    return `+${digits}`;
  }

  // 0xxxxxxxxx -> +971xxxxxxxx (drop leading 0)
  if (digits.startsWith("0")) {
    return `+971${digits.slice(1)}`;
  }

  // Local mobile without prefix: 5xxxxxxxx (or 05xxxxxxxx)
  if (digits.length === 9 && digits.startsWith("5")) {
    return `+971${digits}`;
  }

  // If already looks like full local without 0 (e.g. 50xxxxxxxx), just prefix.
  if (digits.length >= 7 && digits.length <= 12) {
    return `+971${digits}`;
  }

  // Fallback: best effort.
  return `+971${digits}`;
}

function isLikelyEmail(s) {
  const v = norm(s);
  if (!v) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function toIsoDateString(raw) {
  const s = norm(raw);
  if (!s) return "";

  // Handle excel serial if it comes through as a number-like string.
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = Number(s);
    if (Number.isFinite(n) && n > 20000 && n < 60000) {
      const dt = new Date(Math.round((n - 25569) * 86400 * 1000));
      if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
    }
  }

  // Common patterns in your file: 04/Apr/27, 24/Oct/20, 15-May-96, 12-04-1976, 3/1/2031
  // Strategy: attempt Date parsing after normalizing separators.
  const cleaned = s.replace(/\s+/g, " ").trim();

  // dd/Mon/yy(yy)
  const mon = /^(\d{1,2})[\/\-]([A-Za-z]{3,})[\/\-](\d{2,4})$/.exec(cleaned);
  if (mon) {
    const [, dd, mmm, yy] = mon;
    const year = yy.length === 2 ? (Number(yy) >= 70 ? `19${yy}` : `20${yy}`) : yy;
    const dt = new Date(`${dd} ${mmm} ${year}`);
    if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
  }

  // dd-mm-yyyy (or dd-mm-yy)
  const dmyDash = /^(\d{1,2})-(\d{1,2})-(\d{2,4})$/.exec(cleaned);
  if (dmyDash) {
    const [, dd, mm, yy] = dmyDash;
    const year = yy.length === 2 ? (Number(yy) >= 70 ? `19${yy}` : `20${yy}`) : yy;
    const dt = new Date(`${year}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}T00:00:00Z`);
    if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
  }

  // Slash dates are ambiguous. We’ll try ISO parse first; if that fails, try DD/MM/YYYY.
  const dt1 = new Date(cleaned);
  if (!Number.isNaN(dt1.getTime())) return dt1.toISOString().slice(0, 10);

  const dmySlash = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(cleaned);
  if (dmySlash) {
    const [, dd, mm, yy] = dmySlash;
    const year = yy.length === 2 ? (Number(yy) >= 70 ? `19${yy}` : `20${yy}`) : yy;
    const dt = new Date(`${year}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}T00:00:00Z`);
    if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
  }

  return "";
}

function buildRowFromSource(sourceRow) {
  const out = Object.fromEntries(IMPORT_HEADERS.map((h) => [h, ""]));
  out["Full Name"] = norm(sourceRow.fullName);
  out["Email"] = norm(sourceRow.email);
  out["Phone"] = normalizePhone(sourceRow.phone);
  out["Department"] = norm(sourceRow.department);
  // Role is strict-validated against Master `ROLE` in the importer.
  // Your portal has only 3-4 roles; default all imports to `Employee`.
  out["Role"] = "Employee";
  out["Branch"] = norm(sourceRow.workingLocation); // per your choice: working_location
  out["Designation"] = norm(sourceRow.designation);
  out["Joining Date"] = toIsoDateString(sourceRow.doj);
  out["Status"] = norm(sourceRow.workingStatus) || "Onboarding";
  out["Nationality"] = norm(sourceRow.nationality);

  // Employee ID (optional): only keep numeric; otherwise leave blank so backend auto-generates.
  const roll = norm(sourceRow.rollNo);
  if (/^\d+$/.test(roll)) out["Employee ID"] = roll;
  return out;
}

function toIssuesCsv(issues) {
  const headers = [
    "sourceLine",
    "rollNo",
    "fullName",
    "email",
    "issue",
  ];
  const escape = (v) => {
    const s = String(v ?? "");
    if (/[\",\r\n]/.test(s)) return `"${s.replace(/\"/g, '""')}"`;
    return s;
  };
  const lines = [headers.join(",")];
  for (const it of issues) {
    lines.push(headers.map((h) => escape(it[h])).join(","));
  }
  return lines.join("\r\n") + "\r\n";
}

function main() {
  const inputAbs = path.resolve(INPUT);
  const outXlsxAbs = path.resolve(OUT_XLSX);
  const outIssuesAbs = path.resolve(OUT_ISSUES);

  const raw = fs.readFileSync(inputAbs, "utf8");
  const rows = parseCsvWithQuotedNewlines(raw);

  // Find header blocks that contain these canonical labels.
  const headerIdxs = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i].map((v) => norm(v));
    if (r.includes("S#") && r.some((v) => v.toUpperCase() === "ROLL#")) {
      headerIdxs.push(i);
    }
  }
  if (headerIdxs.length === 0) {
    throw new Error("Could not find a header row containing 'S#' and 'ROLL#'.");
  }

  // Use the first header block as the canonical header list.
  const headerRow = rows[headerIdxs[0]].map((v) => norm(v));
  const headerToIndex = new Map();
  headerRow.forEach((h, idx) => {
    const key = norm(h);
    if (key) headerToIndex.set(key, idx);
  });

  const get = (r, headerName) => {
    const idx = headerToIndex.get(headerName);
    if (idx == null) return "";
    return r[idx] ?? "";
  };

  const extracted = [];
  const issues = [];

  for (let i = headerIdxs[0] + 1; i < rows.length; i++) {
    const r = rows[i];
    const normalized = r.map((v) => norm(v));

    // Stop/skip at repeated header blocks.
    if (normalized.includes("S#") && normalized.some((v) => v.toUpperCase() === "ROLL#")) {
      continue;
    }

    // Skip fully empty rows.
    if (normalized.every((v) => !v)) continue;

    const sNo = norm(get(normalized, "S#"));
    // Many non-data lines exist; only process rows that look like employee rows.
    if (!/^\d+$/.test(sNo)) continue;

    const src = {
      rollNo: get(normalized, "ROLL#"),
      fullName: get(normalized, "FULL NAME"),
      email: get(normalized, "Email Address"),
      phone: get(normalized, "CONTACT#"),
      department: get(normalized, "Department"),
      designation: get(normalized, "DESIGNATION"),
      workingLocation: get(normalized, "Working Location"),
      workingStatus: get(normalized, "Working Status"),
      doj: get(normalized, "DOJ"),
      nationality: get(normalized, "NATIONALITY"),
    };

    const email = norm(src.email);
    const fullName = norm(src.fullName);
    const dept = norm(src.department);

    // Role is constant, so we don't require designation for import validity.
    if (!fullName || !email || !dept) {
      issues.push({
        sourceLine: i + 1,
        rollNo: norm(src.rollNo),
        fullName,
        email,
        issue: "Missing required fields after mapping (Full Name, Email, Department)",
      });
      continue;
    }

    if (!isLikelyEmail(email)) {
      issues.push({
        sourceLine: i + 1,
        rollNo: norm(src.rollNo),
        fullName,
        email,
        issue: "Invalid email format",
      });
      continue;
    }

    extracted.push(buildRowFromSource(src));
  }

  const worksheet = XLSX.utils.json_to_sheet(extracted, { header: IMPORT_HEADERS });
  // Ensure header order and presence (xlsx sometimes omits empty headers).
  XLSX.utils.sheet_add_aoa(worksheet, [IMPORT_HEADERS], { origin: "A1" });

  worksheet["!cols"] = IMPORT_HEADERS.map((h) => ({ wch: Math.max(12, h.length + 2) }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");

  const buf = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
  fs.writeFileSync(outXlsxAbs, buf);
  fs.writeFileSync(outIssuesAbs, toIssuesCsv(issues));

  // Also write a quick summary next to issues file for convenience.
  const summary = {
    input: inputAbs,
    outputXlsx: outXlsxAbs,
    outputIssues: outIssuesAbs,
    rowsParsed: rows.length,
    employeesExtracted: extracted.length,
    employeesSkipped: issues.length,
    headerBlocksDetected: headerIdxs.length,
  };
  fs.writeFileSync(
    outIssuesAbs.replace(/\.csv$/i, ".summary.json"),
    JSON.stringify(summary, null, 2) + "\n",
  );

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(summary, null, 2));
}

main();

