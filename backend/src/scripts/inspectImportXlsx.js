// backend/src/scripts/inspectImportXlsx.js
import fs from "fs";
import * as XLSX from "xlsx";

const file = process.env.FILE || "backend/src/Employee_Import_Ready.xlsx";

const wb = XLSX.read(fs.readFileSync(file), { type: "buffer" });
const sheetName = wb.SheetNames[0];
const sh = wb.Sheets[sheetName];

const data = XLSX.utils.sheet_to_json(sh, { defval: "" });

console.log(`file=${file}`);
console.log(`sheet=${sheetName}`);
console.log(`rows=${data.length}`);
if (data.length) {
  const headers = Object.keys(data[0]);
  console.log(`headers=${headers.join("|")}`);
  const required = ["Full Name", "Email", "Role", "Department"];
  const missingRequired = data.filter((r) =>
    required.some((k) => !String(r[k] ?? "").trim()),
  ).length;
  console.log(`missingRequired=${missingRequired}`);
  for (let i = 0; i < Math.min(5, data.length); i++) {
    const r = data[i];
    console.log(
      `row${i + 2}=${[
        r["Employee ID"],
        r["Full Name"],
        r["Email"],
        r["Phone"],
        r["Role"],
        r["Department"],
        r["Branch"],
        r["Joining Date"],
        r["Status"],
      ].join("|")}`,
    );
  }
}

