// backend/src/scripts/extractMasterSeedValues.js
import fs from "fs";
import path from "path";

/**
 * Extract distinct values for Master seeding from the exported Employee Master CSV.
 *
 * Usage (from repo root):
 *   node backend/src/scripts/extractMasterSeedValues.js
 *
 * Optional env vars:
 *   INPUT=backend/src/EMPLOYEE MASTER-UPDATED - Employee Master.csv
 *   OUT=backend/src/master_seed_values.json
 */

const INPUT =
  process.env.INPUT || "backend/src/EMPLOYEE MASTER-UPDATED - Employee Master.csv";
const OUT = process.env.OUT || "backend/src/master_seed_values.json";

function parseCsvWithQuotedNewlines(text) {
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
  const u = s.toUpperCase();
  if (u === "NA" || u === "N/A" || u === "#VALUE!") return "";
  return s;
}

function add(map, val) {
  const s = norm(val);
  if (!s) return;
  const key = s.toLowerCase();
  if (!map.has(key)) map.set(key, s);
}

const inputAbs = path.resolve(INPUT);
const outAbs = path.resolve(OUT);

const raw = fs.readFileSync(inputAbs, "utf8");
const rows = parseCsvWithQuotedNewlines(raw);

// Find first header row with S# and ROLL#
const headerIdx = rows.findIndex((r) => {
  const nr = r.map(norm);
  return nr.includes("S#") && nr.some((v) => v.toUpperCase() === "ROLL#");
});

if (headerIdx < 0) {
  throw new Error("Header row not found (expected 'S#' and 'ROLL#').");
}

const header = rows[headerIdx].map(norm);
const idx = (name) => header.findIndex((h) => h === name);

const iSNo = idx("S#");
const iDesignation = idx("DESIGNATION");
const iDepartment = idx("Department");
const iBranch = idx("Working Location");

if ([iSNo, iDesignation, iDepartment, iBranch].some((n) => n < 0)) {
  throw new Error(
    `Missing one or more headers. Found indexes: S#=${iSNo}, DESIGNATION=${iDesignation}, Department=${iDepartment}, Working Location=${iBranch}`,
  );
}

const designations = new Map();
const departments = new Map();
const branches = new Map();

for (let i = headerIdx + 1; i < rows.length; i++) {
  const r = rows[i];
  if (!r || !r.length) continue;

  const sNo = norm(r[iSNo]);
  if (!/^\d+$/.test(sNo)) continue; // ignore non-employee lines

  add(designations, r[iDesignation]);
  add(departments, r[iDepartment]);
  add(branches, r[iBranch]);
}

const out = {
  input: inputAbs,
  extractedFromHeaderRow: headerIdx + 1,
  counts: {
    designations: designations.size,
    departments: departments.size,
    branches: branches.size,
  },
  designations: [...designations.values()].sort((a, b) => a.localeCompare(b)),
  departments: [...departments.values()].sort((a, b) => a.localeCompare(b)),
  branches: [...branches.values()].sort((a, b) => a.localeCompare(b)),
};

fs.writeFileSync(outAbs, JSON.stringify(out, null, 2) + "\n");
// eslint-disable-next-line no-console
console.log(JSON.stringify(out.counts, null, 2));

