import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import * as XLSX from "xlsx";
import fs from "fs";
import Employee from "./src/models/employeeModel.js";
import Master from "./src/models/masterModel.js";

await mongoose.connect(process.env.DB_URL);

const fileBuffer = fs.readFileSync("/Users/jastin/Downloads/kayzan.xlsx");
const workbook = XLSX.read(fileBuffer, { type: "buffer" });
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet);

const existingEmployees = await Employee.find({}, { email: 1, phone: 1, code: 1 });
const existingEmails = new Set(existingEmployees.map(e => e.email.toLowerCase()));
const existingPhones = new Set(existingEmployees.map(e => e.phone));
const existingCodes = new Set(existingEmployees.map(e => e.code));

const masters = await Master.find({ isActive: true });
const canonicalMap = (type) => new Map(masters.filter(m => m.type === type).map(m => [m.name.toLowerCase(), m.name]));
const validRoles = canonicalMap('ROLE');
const validDepartments = canonicalMap('DEPARTMENT');
const validBranches = canonicalMap('BRANCH');
const validDesignations = canonicalMap('DESIGNATION');
const validContractTypes = canonicalMap('EMPLOYEE_TYPE');
const validCompanies = canonicalMap('COMPANY');

const companyIdByName = new Map(masters.filter(m => m.type === 'COMPANY').map(m => [m.name.toLowerCase(), String(m._id)]));
const branchParentIdByName = new Map(masters.filter(m => m.type === 'BRANCH').map(m => [m.name.toLowerCase(), m.parentId ? String(m.parentId) : null]));

const branchNameByCompanyIdAndName = new Map();
masters.filter(m => m.type === 'BRANCH' && m.parentId).forEach(m => {
    branchNameByCompanyIdAndName.set(`${String(m.parentId)}::${m.name.toLowerCase()}`, m.name);
});

const companyByCode = new Map();
masters.filter(m => m.type === 'COMPANY' && m.code).forEach(m => {
    companyByCode.set(String(m.code).trim(), m.name);
});

const companyNamesByLengthDesc = masters
  .filter(m => m.type === 'COMPANY')
  .map(m => m.name)
  .sort((a, b) => b.length - a.length);

const splitCompanyBranch = (combined) => {
  const text = (combined || "").toString().trim();
  if (!text) return { company: "", branch: "" };
  const match = companyNamesByLengthDesc.find(name =>
    text.toLowerCase() === name.toLowerCase() ||
    text.toLowerCase().startsWith(name.toLowerCase() + " ")
  );
  if (!match) return { company: text, branch: "" };
  return { company: match, branch: text.slice(match.length).trim() };
};

const results = [];
const localSeenEmails = new Set();
const localSeenCodes = new Set();

for (let i = 0; i < data.length; i++) {
  const row = data[i];
  const rowNum = i + 2;
  const name = row["Full Name"];
  const codeRaw = row["Employee Code"] ? row["Employee Code"].toString().trim() : "";

  if (!row["Full Name"] || !row["Email"] || !row["Department"]) {
    results.push({ row: rowNum, code: codeRaw, name, reason: "Missing required fields (Name, Email, Department)" });
    continue;
  }

  const email = row["Email"].trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    results.push({ row: rowNum, code: codeRaw, name, email, reason: `Invalid Email format: '${email}'` });
    continue;
  }

  if (existingEmails.has(email.toLowerCase()) || localSeenEmails.has(email.toLowerCase())) {
    results.push({ row: rowNum, code: codeRaw, name, email, reason: "Email already exists (in DB or duplicated within this file)" });
    continue;
  }
  localSeenEmails.add(email.toLowerCase());

  const phone = (row["Contact Number"] || row["Phone"]) ? String(row["Contact Number"] || row["Phone"]).trim() : "";
  if (phone && existingPhones.has(phone)) {
    results.push({ row: rowNum, code: codeRaw, name, email, reason: `Phone number already exists: '${phone}'` });
    continue;
  }

  if (codeRaw && (existingCodes.has(codeRaw) || localSeenCodes.has(codeRaw))) {
    results.push({ row: rowNum, code: codeRaw, name, email, reason: `Employee Code '${codeRaw}' already exists (in DB or duplicated within this file)` });
    continue;
  }
  if (codeRaw) localSeenCodes.add(codeRaw);

  let role = row["Role"] ? row["Role"].trim() : "Employee";
  let department = row["Department"].trim();
  let company, branch;
  if (row["Company"] || row["Branch"]) {
    company = (row["Company"] || "").toString().trim();
    branch = (row["Branch"] || "").toString().trim();
  } else {
    ({ company, branch } = splitCompanyBranch(row["COMPANY / BRANCH"]));
  }
  let designation = row["Designation"] ? row["Designation"].trim() : "";
  let contractType = row["Employee Type"] ? row["Employee Type"].trim() : "";
  const workLocationCode = row["WORK LOCATION"] != null ? String(row["WORK LOCATION"]).trim() : "";
  const visaLocationCode = row["VISA LOCATION"] != null ? String(row["VISA LOCATION"]).trim() : "";

  if (row["Role"] && !validRoles.has(role.toLowerCase())) {
    results.push({ row: rowNum, code: codeRaw, name, email, reason: `Invalid Role: '${role}'` });
    continue;
  }
  role = validRoles.get(role.toLowerCase()) || role;

  if (!validDepartments.has(department.toLowerCase())) {
    results.push({ row: rowNum, code: codeRaw, name, email, reason: `Invalid Department: '${department}'` });
    continue;
  }
  department = validDepartments.get(department.toLowerCase());

  if (company && !validCompanies.has(company.toLowerCase())) {
    results.push({ row: rowNum, code: codeRaw, name, email, reason: `Invalid Company: '${company}' (parsed from "COMPANY / BRANCH": '${row["COMPANY / BRANCH"]}')` });
    continue;
  }
  if (company) company = validCompanies.get(company.toLowerCase());

  if (branch && !validBranches.has(branch.toLowerCase())) {
    results.push({ row: rowNum, code: codeRaw, name, email, reason: `Invalid Branch: '${branch}' (parsed from "COMPANY / BRANCH": '${row["COMPANY / BRANCH"]}')` });
    continue;
  }
  if (branch) {
    branch = validBranches.get(branch.toLowerCase());
    const branchParentId = branchParentIdByName.get(branch.toLowerCase());
    const companyId = company ? companyIdByName.get(company.toLowerCase()) : null;
    if (company && branchParentId !== companyId) {
      results.push({ row: rowNum, code: codeRaw, name, email, reason: `Branch '${branch}' does not belong to Company '${company}' (parsed from "COMPANY / BRANCH": '${row["COMPANY / BRANCH"]}')` });
      continue;
    }
  }

  if (designation && !validDesignations.has(designation.toLowerCase())) {
    results.push({ row: rowNum, code: codeRaw, name, email, reason: `Invalid Designation: '${designation}'` });
    continue;
  }
  if (designation) designation = validDesignations.get(designation.toLowerCase());

  if (contractType && !validContractTypes.has(contractType.toLowerCase())) {
    results.push({ row: rowNum, code: codeRaw, name, email, reason: `Invalid Employee Type: '${contractType}'` });
    continue;
  }
  if (contractType) contractType = validContractTypes.get(contractType.toLowerCase());

  const resolveLocationCode = (code) => {
    if (company) {
      const companyId = companyIdByName.get(company.toLowerCase());
      const matchedBranch = companyId ? branchNameByCompanyIdAndName.get(`${companyId}::${code.toLowerCase()}`) : null;
      if (matchedBranch) {
        return { value: matchedBranch };
      }
    }
    const byCompanyCode = companyByCode.get(code);
    if (byCompanyCode) return { value: byCompanyCode };
    return null;
  };

  if (workLocationCode) {
    const resolved = resolveLocationCode(workLocationCode);
    if (!resolved?.value) {
      results.push({ row: rowNum, code: codeRaw, name, email, reason: `Invalid Work Location: '${workLocationCode}'. No Branch with this name under '${company || "the row's company"}' (or Company Code ID) was found. [COMPANY/BRANCH raw: '${row["COMPANY / BRANCH"]}']` });
      continue;
    }
  }

  if (visaLocationCode) {
    const resolved = resolveLocationCode(visaLocationCode);
    if (!resolved?.value) {
      results.push({ row: rowNum, code: codeRaw, name, email, reason: `Invalid Visa Location: '${visaLocationCode}'. No Branch with this name under '${company || "the row's company"}' (or Company Code ID) was found. [COMPANY/BRANCH raw: '${row["COMPANY / BRANCH"]}']` });
      continue;
    }
  }
}

console.log("Total rows:", data.length);
console.log("Rows that would FAIL import:", results.length);
console.log("Rows that would SUCCEED:", data.length - results.length);
console.log("\n--- Failure reason categories ---");
const categories = {};
results.forEach(r => {
  const cat = r.reason.split(":")[0].split("(")[0].trim();
  categories[cat] = (categories[cat] || 0) + 1;
});
console.log(JSON.stringify(categories, null, 2));

console.log("\n--- First 30 failing rows in detail ---");
console.log(JSON.stringify(results.slice(0, 30), null, 2));

await mongoose.disconnect();
process.exit(0);
