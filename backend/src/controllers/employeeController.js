import * as XLSX from "xlsx";
import Employee from "../models/employeeModel.js";
import Master from "../models/masterModel.js";
import { createNotification } from "./notificationController.js";
import User from "../models/userModel.js";
import bcrypt from "bcryptjs";
import { sendEmail } from "../utils/sendEmail.js";
import { logActivity } from "../utils/activityLogger.js";
import { getSignedFileUrl, storeUploadedFile } from "../utils/storage.js";
import { toNumber, computeTotalSalary, computeCtc } from "../utils/salaryCalc.js";
import { createOnboardingWorkflowForEmployee } from "./workflowController.js";

const buildLaborCards = (payload = {}) => {
  if (Array.isArray(payload.laborCards) && payload.laborCards.length > 0) {
    return payload.laborCards
      .filter((item) => item && item.number)
      .map((item, index) => ({
        number: item.number,
        issueDate: item.issueDate || null,
        expiryDate: item.expiryDate || null,
        notes: item.notes || "",
        isPrimary: Boolean(item.isPrimary || index === 0)
      }));
  }

  if (payload.laborCardNumber) {
    return [{
      number: payload.laborCardNumber,
      issueDate: null,
      expiryDate: null,
      notes: "",
      isPrimary: true
    }];
  }

  return [];
};

const buildInitialSalaryHistory = (payload = {}) => {
  const basicSalary = toNumber(payload.basicSalary);
  const visaBase = toNumber(payload.visaBase || basicSalary);
  const workBase = toNumber(payload.workBase || basicSalary);
  const ctc = toNumber(payload.ctc || workBase);

  if (!basicSalary && !visaBase && !workBase && !ctc) {
    return [];
  }

  return [{
    salaryType: "JOINING",
    basicSalary,
    visaBase,
    workBase,
    ctc,
    incrementAmount: 0,
    effectiveDate: payload.joinDate || new Date(),
    notes: "Joining salary"
  }];
};

const getProbationStatus = (payload = {}) => {
  if (!payload.probationEndDate) return "NOT_APPLICABLE";
  const today = new Date();
  const probationEnd = new Date(payload.probationEndDate);
  if (payload.probationConfirmedAt) return "CONFIRMED";
  return probationEnd <= today ? "PENDING_CONFIRMATION" : "ACTIVE";
};

// designatedManager/designatedFinanceManager are stored as the manager's Employee._id (what
// the Add/Edit Employee dropdowns actually send and display) - not a User._id. This just
// validates the referenced Employee exists; approval routing (requestController.js) resolves
// the linked User account separately via User.findOne({ employeeId }).
const resolveManagerEmployeeId = async (designatedManager) => {
  if (!designatedManager) return null;
  const exists = await Employee.exists({ _id: designatedManager });
  return exists ? designatedManager : null;
};

const resolveFinanceManagerEmployeeId = async (designatedFinanceManager) => {
  if (!designatedFinanceManager) return null;
  const exists = await Employee.exists({ _id: designatedFinanceManager });
  return exists ? designatedFinanceManager : null;
};

const attachSignedProfilePhotoUrl = async (employee) => {
  if (!employee) return null;
  const item = employee.toObject ? employee.toObject() : { ...employee };
  try {
    item.profilePhotoUrl = await getSignedFileUrl({
      filePath: item.profilePhotoPath,
      fileUrl: item.profilePhotoUrl,
      storage: item.profilePhotoStorage
    });
  } catch (err) {
    console.error("Failed to sign profile photo URL:", err.message);
  }
  return item;
};

// Legacy records can have a date field stored as a plain string (from data that predates
// the Date schema type, or a bad import) - $convert guards that. Some also hold a real Date
// with a garbage year (e.g. a bad Excel-serial import producing year 20024) - $dateToString's
// %Y only supports 0-9999, so also bail out via $year before formatting. Either case degrades
// to "" instead of crashing the whole export.
const safeDateStr = (path) => ({
  $let: {
    vars: {
      d: { $convert: { input: path, to: "date", onError: null, onNull: null } }
    },
    in: {
      $cond: [
        {
          $or: [
            { $eq: ["$$d", null] },
            { $lt: [{ $year: "$$d" }, 0] },
            { $gt: [{ $year: "$$d" }, 9999] }
          ]
        },
        "",
        { $dateToString: { format: "%Y-%m-%d", date: "$$d" } }
      ]
    }
  }
});

export const exportEmployees = async (req, res) => {
  try {
    const { department, status, search, branch, company, designation } = req.query;

    let matchStage = {};

    // Filter by Branch
    if (branch && branch !== "All Branches") {
      matchStage.branch = branch;
    }

    // Filter by Company
    if (company && company !== "All Companies") {
      matchStage.company = company;
    }

    // Filter by Designation
    if (designation && designation !== "All Designations") {
      matchStage.designation = designation;
    }

    // Filter by Department
    if (department && department !== "All Departments") {
      matchStage.department = department;
    }

    // Filter by Status
    if (status && status !== "All Status") {
      matchStage.status = status;
    }

    // Filter by Search (Name, Code)
    if (search) {
      matchStage.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } }
      ];
    }

    // Column headers match the ones importEmployees() reads, so an exported file
    // can be re-imported as-is.
    const employees = await Employee.aggregate([
      { $match: matchStage },
      { $sort: { code: 1 } },
      {
        $project: {
          _id: 0,
          "Employee Code": "$code",
          "Full Name": "$name",
          "Role": "$role",
          "Department": "$department",
          "Company": "$company",
          "Branch": "$branch",
          "Designation": "$designation",
          "Employee Type": "$contractType",
          "Email": "$email",
          "Contact Number": "$phone",
          "Status": "$status",
          "Shift": "$shift",
          "Joining Date": safeDateStr("$joinDate"),
          "Date of Birth": safeDateStr("$dob"),
          "Nationality": "$nationality",
          "UAE Address": "$address",
          "Personal ID (14 Digit)": "$personalId",
          "Passport No": "$passportNo",
          "Passport Expiry": safeDateStr("$passportExpiry"),
          "Emirates ID No": "$emiratesIdNo",
          "Emirates ID Expiry": safeDateStr("$emiratesIdExpiry"),
          "Basic Salary": "$basicSalary",
          "Allowance (AED)": "$allowance",
          "HRA (AED)": "$hra",
          "ACCOMODATION ALLOWANCE": "$accommodationAllowance",
          "VEHICHLE ALLOWANCE": "$vehicleAllowance",
          "Total Salary (AED)": "$totalSalary",
          "Visa Base": "$visaBase",
          "Work Base": "$workBase",
          "Visa Company": "$visaCompany",
          "Work Permit Company": "$workPermitCompany",
          "Visa No": "$visaNo",
          "Visa File No": "$visaFileNo",
          "Visa Expiry": safeDateStr("$visaExpiry"),
          "Accommodation": "$accommodation",
          "Bank Name": "$bankName",
          "IBAN": "$iban",
          "Account Number": "$bankAccount",
          "Agent ID (WPS)": "$agentId",
          "Labor Card No": "$laborCardNumber",
          "Probation End Date": safeDateStr("$probationEndDate"),
          "Fixed Probation Increment Amount": "$fixedProbationIncrementAmount"
        }
      }
    ]);

    const worksheet = XLSX.utils.json_to_sheet(employees);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");

    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

    res.setHeader("Content-Disposition", 'attachment; filename="Employees.xlsx"');
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);

  } catch (error) {
    console.error("Export Error:", error);
    res.status(500).json({ message: "Export failed" });
  }
};

export const addEmployee = async (req, res) => {
  try {
    const {
      name,
      code,
      role,
      department,
      branch,
      company,
      email,
      phone,
      joinDate,
      status,
      dob,
      nationality,
      address,
      passportExpiry,
      emiratesIdExpiry,
      designation,
      contractType,
      basicSalary,
      allowance,
      hra,
      accommodationAllowance,
      vehicleAllowance,
      visaBase,
      workBase,
      ctc,
      accommodation,
      visaCompany,
      workPermitCompany,
      visaNo,
      visaFileNo,
      visaExpiry,
      shift,
      laborCardNumber,
      laborCards,
      personalId,
      bankName,
      iban,
      bankAccount,
      agentId,
      designatedManager,
      designatedFinanceManager,
      probationStartDate,
      probationEndDate,
      fixedProbationIncrementAmount
    } = req.body;

    // 1. Strict Validation
    if (!name || name.trim().length < 2) return res.status(400).json({ message: "Valid Name is required" });
    if (!code || !code.trim()) return res.status(400).json({ message: "Employee Code is required" });
    if (!role) return res.status(400).json({ message: "Role is required" });
    if (!department) return res.status(400).json({ message: "Department is required" });
    if (!joinDate) return res.status(400).json({ message: "Joining Date is required" });

    const existingCode = await Employee.findOne({ code: code.trim() });
    if (existingCode) return res.status(409).json({ message: `Employee Code '${code.trim()}' is already in use` });

    // Email Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ message: "Valid Email is required" });
    }

    // Phone Validation - any country code (frontend has a country-code selector), not UAE-only.
    // Accepts +<country code><7-14 digits>, or a bare UAE-style number as a fallback for callers
    // that don't send a country code at all.
    const internationalPhoneRegex = /^\+[1-9]\d{6,14}$/;
    const uaeFallbackRegex = /^(?:00971|971|0)?\d{7,12}$/;

    // Sanitize spaces/dashes before check
    const cleanPhone = phone ? phone.replace(/[\s-]/g, '') : '';

    if (!cleanPhone || !(internationalPhoneRegex.test(cleanPhone) || uaeFallbackRegex.test(cleanPhone))) {
      return res.status(400).json({ message: "Valid Phone Number (with country code) is required" });
    }

    // 2. Check for Duplicates (Email or Phone)
    const existingEmployee = await Employee.findOne({
      $or: [{ email: email }, { phone: phone }]
    });

    if (existingEmployee) {
      if (existingEmployee.email === email) return res.status(409).json({ message: "Email already exists" });
      if (existingEmployee.phone === phone) return res.status(409).json({ message: "Phone number already exists" });
    }

    const resolvedDesignatedManager = await resolveManagerEmployeeId(designatedManager);
    const resolvedDesignatedFinanceManager = await resolveFinanceManagerEmployeeId(designatedFinanceManager);

    // 3. Generate the internal auto-incremented reference number (independent of the
    // user-supplied, editable `code`). Sorts on systemCode itself so manual `code` edits
    // elsewhere never disturb this sequence.
    const lastSystemCoded = await Employee.findOne({ systemCode: { $exists: true, $ne: null } }).sort({ systemCode: -1 });
    let nextSystemCode = "EMP001";

    if (lastSystemCoded && lastSystemCoded.systemCode) {
      const lastNumber = parseInt(lastSystemCoded.systemCode.replace("EMP", ""), 10);
      if (!isNaN(lastNumber)) {
        nextSystemCode = `EMP${String(lastNumber + 1).padStart(3, "0")}`;
      }
    }

    // 4. Auto-create User account for login (CRITICAL STEP)
    // If this fails, Employee will NOT be added

    // Normalize phone for User model (+971 format)
    let userPhone = phone.replace(/\s+/g, "");
    if (userPhone.startsWith("0")) {
      userPhone = "+971" + userPhone.substring(1);
    } else if (userPhone.startsWith("971")) {
      userPhone = "+" + userPhone;
    }

    const userExists = await User.findOne({ email });
    let createdUser = false;

    if (!userExists) {
      try {
        const hashedPassword = await bcrypt.hash("Password@123", 10);
        await User.create({
          name,
          email,
          phone: userPhone,
          password: hashedPassword,
          role: role,
          mustChangePassword: true
        });
        createdUser = true;
      } catch (uErr) {
        // console.error("User creation failed:", uErr.message);
        return res.status(500).json({ message: "Failed to create User account. Employee not added." });
      }
    }

    // Total Salary / CTC are always server-computed from basic+allowance+hra (+accommodation/
    // vehicle for CTC) - see backend/src/utils/salaryCalc.js - never trusted from the client.
    const salaryInputs = { basicSalary, allowance, hra, accommodationAllowance, vehicleAllowance };
    const computedTotalSalary = computeTotalSalary(salaryInputs);
    const computedCtc = computeCtc(salaryInputs);

    // 5. Create Employee (Only if User valid)
    const employee = await Employee.create({
      name,
      code: code.trim(),
      systemCode: nextSystemCode,
      role,
      department,
      branch,
      company: company || "",
      email,
      phone,
      joinDate,
      status: status || "Onboarding",
      dob, nationality, address, passportExpiry, emiratesIdExpiry,
      designation,
      contractType,
      basicSalary,
      allowance: toNumber(allowance),
      hra: toNumber(hra),
      accommodationAllowance: toNumber(accommodationAllowance),
      vehicleAllowance: toNumber(vehicleAllowance),
      totalSalary: computedTotalSalary,
      visaBase: toNumber(visaBase || basicSalary),
      workBase: toNumber(workBase || basicSalary),
      ctc: computedCtc,
      accommodation,
      visaCompany: visaCompany || "",
      workPermitCompany: workPermitCompany || "",
      visaNo: visaNo || "",
      visaFileNo: visaFileNo || "",
      visaExpiry,
      shift: shift || "Day Shift",
      laborCardNumber: laborCardNumber || "",
      laborCards: buildLaborCards({ laborCards, laborCardNumber }),
      personalId,
      bankName,
      iban,
      bankAccount,
      agentId,
      designatedManager: resolvedDesignatedManager,
      designatedFinanceManager: resolvedDesignatedFinanceManager,
      probationStartDate: probationStartDate || joinDate || null,
      probationEndDate: probationEndDate || null,
      probationStatus: getProbationStatus({ probationEndDate }),
      fixedProbationIncrementAmount: toNumber(fixedProbationIncrementAmount),
      salaryHistory: buildInitialSalaryHistory({
        basicSalary,
        visaBase,
        workBase,
        ctc: computedCtc,
        joinDate
      })
    });

    await User.findOneAndUpdate(
      { email },
      { employeeId: employee._id, role },
      { new: true }
    );

    res.status(201).json({
      message: createdUser
        ? "Employee added & User account created (Password: Password@123)"
        : "Employee added (User account already existed)",
      employee
    });

    // Only when the employee is created directly with status "Onboarding" (today's
    // Add Employee default) - an employee added as already-Active (e.g. inter-branch
    // transfer) gets no checklist forced on them. Fire-and-forget: a template hiccup
    // here shouldn't fail the employee-creation response that's already been sent.
    if (employee.status === "Onboarding") {
      createOnboardingWorkflowForEmployee(employee._id, req.user._id).catch((err) => {
        console.error("Failed to auto-create onboarding workflow:", err.message);
      });
    }

    logActivity({
      req,
      action: "CREATE",
      module: "EMPLOYEE",
      description: `Employee ${employee.name} (${employee.code}) created`,
      targetId: employee._id,
      targetName: employee.name
    }).catch(() => {});
  } catch (error) {
    // console.error("Add Employee Error:", error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    if (error.code === 11000) {
      return res.status(409).json({ message: "Duplicate entry found (Email or Phone)" });
    }
    res.status(500).json({ message: "Server error: " + error.message });
  }
};

export const getEmployees = async (req, res) => {
  try {
    const { department, status, search, branch, company, designation, page, limit } = req.query;

    let matchStage = {};
    const andFilters = [];

    // Filter by Branch
    if (branch && branch !== "All Branches") {
      matchStage.branch = branch;
    }

    // Filter by Company
    if (company && company !== "All Companies") {
      matchStage.company = company;
    }

    // Filter by Designation
    if (designation && designation !== "All Designations") {
      matchStage.designation = designation;
    }

    // Filter by Department
    if (department && department !== "All Departments") {
      matchStage.department = department;
    }

    // Filter by Status
    if (status && status !== "All Status") {
      matchStage.status = status;
    }

    // Filter by Search (Name, Code)
    if (search) {
      andFilters.push({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { code: { $regex: search, $options: "i" } }
        ]
      });
    }

    // Manager/Finance Manager both carry VIEW_ALL_EMPLOYEES (see config/db.js's default
    // role permissions) so they can use employee pickers/assignment dropdowns - that
    // permission was never meant to expose the entire company's employee list to them.
    // Admin/HR keep unrestricted access; a Manager/Finance Manager who isn't also one of
    // those gets scoped to their own direct reports (by designatedManager/
    // designatedFinanceManager) plus their own record.
    const requester = req.user || {};
    const hasFullAccess = requester.role === "Admin"
      || /^HR/i.test(requester.role || "")
      || requester.permissions?.includes("ALL")
      || requester.permissions?.includes("APPROVE_REQUESTS");

    if (!hasFullAccess) {
      const isManager = requester.role === "Manager" || requester.permissions?.includes("APPROVE_MANAGER_REQUESTS");
      const isFinanceManager = requester.role === "Finance Manager" || requester.permissions?.includes("APPROVE_FINANCE_REQUESTS");

      if (isManager || isFinanceManager) {
        const scope = [requester._id, requester.employeeId].filter(Boolean);
        const scopeOr = [];
        if (requester.employeeId) scopeOr.push({ _id: requester.employeeId });
        if (isManager) scopeOr.push({ designatedManager: { $in: scope } });
        if (isFinanceManager) scopeOr.push({ designatedFinanceManager: { $in: scope } });
        andFilters.push({ $or: scopeOr.length ? scopeOr : [{ _id: null }] });
      }
    }

    if (andFilters.length) {
      matchStage.$and = andFilters;
    }

    const employees = await Employee.find(matchStage).lean();

    const getCodeOrder = (code = "") => {
      const numeric = parseInt(String(code).replace(/[^\d]/g, ""), 10);
      return Number.isFinite(numeric) ? numeric : Number.MAX_SAFE_INTEGER;
    };

    employees.sort((a, b) => {
      const codeDiff = getCodeOrder(a.code) - getCodeOrder(b.code);
      if (codeDiff !== 0) return codeDiff;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });

    // Pagination is opt-in via ?page= - every existing caller (Add/Edit Employee
    // pickers, Onboarding/Offboarding lists, asset-assignment dropdowns, etc.) calls
    // this without `page` and keeps getting the full bare array exactly as before.
    // Only the Employees list page passes `page`, so only it needs to handle the
    // wrapped { employees, total, page, totalPages } shape.
    if (page !== undefined) {
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.max(1, parseInt(limit, 10) || 50);
      const total = employees.length;
      const pageEmployees = employees.slice((pageNum - 1) * limitNum, pageNum * limitNum);

      const signedEmployees = await Promise.all(
        pageEmployees.map((employee) => attachSignedProfilePhotoUrl(employee))
      );

      return res.json({
        employees: signedEmployees,
        total,
        page: pageNum,
        totalPages: Math.max(1, Math.ceil(total / limitNum))
      });
    }

    const signedEmployees = await Promise.all(
      employees.map((employee) => attachSignedProfilePhotoUrl(employee))
    );

    res.json(signedEmployees);
  } catch (error) {
    console.error("Get employees error:", error);
    res.status(500).json({ message: "Server error" });
  }
};




export const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions, role, employeeId } = req.user;

    const employee = await Employee.findById(id);

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Permission Check: Admin or has VIEW_ALL_EMPLOYEES or it's their own profile
    const canViewAll = role === "Admin" || permissions.includes("ALL") || permissions.includes("VIEW_ALL_EMPLOYEES");
    const isOwnProfile = employeeId && employeeId.toString() === id;

    if (!canViewAll && !isOwnProfile) {
      return res.status(403).json({ message: "Access Denied: You cannot view this profile" });
    }

    // Promote any future-dated transfer whose effective date has now arrived. This is a
    // background side effect of viewing the profile, not something the viewer asked for -
    // if it fails (e.g. a legacy bad field on this employee trips validation on save), don't
    // let it take down the whole detail view. The transfer just stays pending and gets
    // retried next time this employee is viewed.
    try {
      await applyDuePendingTransfers(employee);
    } catch (transferError) {
      console.error("applyDuePendingTransfers failed for employee", id, ":", transferError);
    }

    res.json(await attachSignedProfilePhotoUrl(employee));
  } catch (error) {
    console.error("Get Employee By ID Error:", error);
    res.status(500).json({ message: "Server error: " + error.message });
  }
};

// GET /employees/me — Returns the employee record linked to the currently logged-in user.
// Resolution order (most reliable → fallback):
//   1. req.user.employeeId  — explicitly linked (set at login / auto-heal)
//   2. email match          — case-insensitive, catches accounts created before the
//                             employeeId link was introduced
// Returns 404 (not 500) when no employee record exists so the frontend can show a
// clean "no profile" state instead of a generic error.
export const getMyEmployeeProfile = async (req, res) => {
  console.log("🔍 [GET /api/employees/me] Request received from user:", req.user?._id, "| Email:", req.user?.email, "| Role:", req.user?.role, "| Stored employeeId:", req.user?.employeeId);
  try {
    const user = req.user;
    let employee = null;

    // 1. Try the stored employeeId first (fastest path)
    if (user.employeeId) {
      console.log("  ↳ Lookup strategy 1: Checking user.employeeId:", user.employeeId);
      employee = await Employee.findById(user.employeeId);
    }

    // 2. Fall back to email match — escape special regex chars so an email like
    //    "user+tag@domain.com" doesn't throw a bad-regex error.
    if (!employee && user.email) {
      console.log("  ↳ Lookup strategy 2: Searching employee by email:", user.email);
      const escapedEmail = user.email.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      employee = await Employee.findOne({
        email: { $regex: new RegExp(`^${escapedEmail}$`, "i") }
      });
    }

    if (!employee) {
      console.warn("  ⚠️ No employee profile matched for user email:", user.email);
      return res.status(404).json({ message: "No employee profile found for this user." });
    }

    console.log("  ✅ Employee profile matched:", employee._id, "| Name:", employee.name);

    // If we found via email but the User document wasn't linked yet, persist the link
    // so future requests hit path 1 (fastest) and the middleware auto-heal also works.
    if (!user.employeeId) {
      try {
        await User.findByIdAndUpdate(user._id, { employeeId: employee._id });
        console.log("  🔗 Auto-linked employeeId to User record.");
      } catch (linkError) {
        console.warn("  ⚠️ Could not auto-link employeeId to user:", linkError.message);
      }
    }

    try {
      await applyDuePendingTransfers(employee);
    } catch (transferError) {
      console.error("  ⚠️ applyDuePendingTransfers failed for /me:", transferError);
    }

    const responseData = await attachSignedProfilePhotoUrl(employee);
    console.log("  📤 Successfully returning profile for employee:", employee.name);
    res.json(responseData);
  } catch (error) {
    console.error("❌ [GET /api/employees/me] ERROR:", error.stack || error);
    res.status(500).json({ message: "Server error: " + error.message });
  }
};



export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, email, phone, code } = req.body;

    // Check for duplicate email/phone excluding current user
    if (email || phone) {
      const existing = await Employee.findOne({
        $and: [
          { _id: { $ne: id } },
          { $or: [{ email }, { phone }] }
        ]
      });

      if (existing) {
        if (existing.email === email) return res.status(409).json({ message: "Email already exists" });
        if (existing.phone === phone) return res.status(409).json({ message: "Phone number already exists" });
      }
    }

    if (code !== undefined) {
      if (!code || !code.trim()) return res.status(400).json({ message: "Employee Code is required" });
      const existingCode = await Employee.findOne({ _id: { $ne: id }, code: code.trim() });
      if (existingCode) return res.status(409).json({ message: `Employee Code '${code.trim()}' is already in use` });
    }

    const payload = { ...req.body };
    delete payload.systemCode; // internal reference number, never client-editable

    // ---- Field-level permission guard ----------------------------------------
    // The route only checks MANAGE_EMPLOYEES, so any HR/manager user reaching here can
    // otherwise rewrite salary or their own reporting line. Two rules:
    //   1. Salary fields require MANAGE_PAYROLL (else silently stripped).
    //   2. Nobody (except Admin) may edit their OWN salary or manager fields.
    const perms = req.user.permissions || [];
    const isAdmin = req.user.role === "Admin" || perms.includes("ALL");
    const canEditSalary = isAdmin || perms.includes("MANAGE_PAYROLL");
    const isSelf = req.user.employeeId && String(req.user.employeeId) === String(id);

    const SALARY_FIELDS = [
      "basicSalary", "allowance", "hra", "accommodationAllowance", "vehicleAllowance",
      "totalSalary", "visaBase", "workBase", "ctc", "fixedProbationIncrementAmount",
      "salaryHistory"
    ];
    const MANAGER_FIELDS = ["designatedManager", "designatedFinanceManager"];

    let salaryEditAllowed = canEditSalary;
    if (!canEditSalary) SALARY_FIELDS.forEach((f) => delete payload[f]);
    if (isSelf && !isAdmin) {
      [...SALARY_FIELDS, ...MANAGER_FIELDS].forEach((f) => delete payload[f]);
      salaryEditAllowed = false;
    }
    // --------------------------------------------------------------------------

    if (payload.designatedManager !== undefined) {
      payload.designatedManager = await resolveManagerEmployeeId(payload.designatedManager);
    }
    if (payload.designatedFinanceManager !== undefined) {
      payload.designatedFinanceManager = await resolveFinanceManagerEmployeeId(payload.designatedFinanceManager);
    }

    if (payload.laborCards || payload.laborCardNumber) {
      payload.laborCards = buildLaborCards(payload);
      payload.laborCardNumber = payload.laborCards[0]?.number || payload.laborCardNumber || "";
    }

    if (payload.visaBase !== undefined) payload.visaBase = toNumber(payload.visaBase);
    if (payload.workBase !== undefined) payload.workBase = toNumber(payload.workBase);
    if (payload.ctc !== undefined) payload.ctc = toNumber(payload.ctc);
    if (payload.fixedProbationIncrementAmount !== undefined) {
      payload.fixedProbationIncrementAmount = toNumber(payload.fixedProbationIncrementAmount);
    }
    if (payload.probationEndDate || payload.probationConfirmedAt) {
      payload.probationStatus = getProbationStatus(payload);
    }

    // Snapshot before update so the activity log can record a field-level diff.
    const before = await Employee.findById(id).lean();

    const updatedEmployee = await Employee.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true
    });

    if (!updatedEmployee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Total Salary / CTC are never trusted from the client - always recomputed from the
    // persisted basic/allowance/hra(/accommodation/vehicle) fields after every update, so
    // a stale client-typed value (or a caller that doesn't send them at all) can't desync
    // them from the source fields (see backend/src/utils/salaryCalc.js).
    const correctTotalSalary = computeTotalSalary(updatedEmployee);
    const correctCtc = computeCtc(updatedEmployee);
    if (updatedEmployee.totalSalary !== correctTotalSalary || updatedEmployee.ctc !== correctCtc) {
      updatedEmployee.totalSalary = correctTotalSalary;
      updatedEmployee.ctc = correctCtc;
      await updatedEmployee.save();
    }

    // Sync the linked User account with this update.
    // Look up by employeeId first (the authoritative link) rather than by the
    // employee's OLD email - if email is changing this update, `before.email` no
    // longer matches the User we actually want to touch. Falls back to the old email
    // for legacy records that predate employeeId being set at all.
    const emailChanged = before && payload.email !== undefined && before.email !== updatedEmployee.email;
    let linkedUser = await User.findOne({ employeeId: id });
    if (!linkedUser && before?.email) {
      linkedUser = await User.findOne({ email: before.email });
    }

    if (linkedUser) {
      if (role) linkedUser.role = role;
      if (emailChanged) linkedUser.email = updatedEmployee.email;
      if (!linkedUser.employeeId) linkedUser.employeeId = updatedEmployee._id; // heal a bulk-import gap while we're here
      if (linkedUser.isModified()) {
        try {
          await linkedUser.save();
        } catch (userSyncErr) {
          // Don't fail the whole employee update over a User-side conflict (e.g. the new
          // email collides with a different existing User) - the Employee document is
          // already saved at this point, so the update itself should still succeed.
          console.error(`[updateEmployee] Failed to sync linked User for employee ${id}: ${userSyncErr.message}`);
        }
      }
    } else if (emailChanged) {
      // No User linked at all (by employeeId or by the old email) but the new email
      // matches an existing, unlinked User - heal the link rather than leaving it
      // orphaned for "Reset Password" to have to provision a fresh duplicate account.
      const byNewEmail = await User.findOne({ email: updatedEmployee.email });
      if (byNewEmail && !byNewEmail.employeeId) {
        byNewEmail.employeeId = updatedEmployee._id;
        if (role) byNewEmail.role = role;
        await byNewEmail.save();
      }
    }

    if (req.body.appendSalaryHistory && salaryEditAllowed) {
      updatedEmployee.salaryHistory.push({
        salaryType: req.body.salaryType || "MANUAL_ADJUSTMENT",
        basicSalary: toNumber(updatedEmployee.basicSalary),
        visaBase: toNumber(updatedEmployee.visaBase || updatedEmployee.basicSalary),
        workBase: toNumber(updatedEmployee.workBase || updatedEmployee.basicSalary),
        ctc: toNumber(updatedEmployee.ctc || updatedEmployee.workBase || updatedEmployee.basicSalary),
        incrementAmount: toNumber(req.body.incrementAmount),
        effectiveDate: req.body.effectiveSalaryDate || new Date(),
        notes: req.body.salaryNotes || "",
        createdBy: req.user._id
      });
      await updatedEmployee.save();
    }

    res.json({ employee: updatedEmployee });

    // Build a field-level diff for the activity log. Skip internal/array/helper keys that
    // don't read as clean before/after scalars.
    const SKIP_DIFF = new Set([
      "systemCode", "salaryHistory", "transferHistory", "laborCards",
      "appendSalaryHistory", "salaryType", "incrementAmount", "effectiveSalaryDate",
      "salaryNotes", "profilePhotoPath", "profilePhotoUrl", "_id", "__v",
      "createdAt", "updatedAt"
    ]);
    const changes = {};
    if (before) {
      for (const key of Object.keys(payload)) {
        if (SKIP_DIFF.has(key)) continue;
        const fromVal = before[key];
        const toVal = updatedEmployee[key];
        const norm = (v) => (v === undefined || v === null ? "" : String(v));
        if (norm(fromVal) !== norm(toVal)) {
          changes[key] = { from: fromVal ?? null, to: toVal ?? null };
        }
      }
    }
    const changedFields = Object.keys(changes);

    logActivity({
      req,
      action: "UPDATE",
      module: "EMPLOYEE",
      description: changedFields.length
        ? `Employee ${updatedEmployee.name} (${updatedEmployee.code}) updated: ${changedFields.join(", ")}`
        : `Employee ${updatedEmployee.name} (${updatedEmployee.code}) updated`,
      targetId: updatedEmployee._id,
      targetName: updatedEmployee.name,
      metadata: { changes }
    }).catch(() => {});
  } catch (error) {
    // console.error("Update Employee Error:", error);
    if (error.code === 11000) {
      return res.status(409).json({ message: "Duplicate entry found (Email or Phone)" });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Server error: " + error.message });
  }
};

export const deleteAllowance = async (req, res) => {
  try {
    const { employeeId, allowanceId } = req.params;
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const allowance = employee.allowances.id(allowanceId);
    if (!allowance) {
      return res.status(404).json({ message: "Allowance not found" });
    }

    employee.allowances.pull(allowanceId);
    // totalSalary/ctc never include allowances[] under the current formula (see
    // salaryCalc.js), so removing one can't change either - recomputed anyway to stay
    // self-healing against any employee whose stored values still predate that formula.
    employee.totalSalary = computeTotalSalary(employee);
    employee.ctc = computeCtc(employee);
    await employee.save();

    logActivity({
      req,
      action: "UPDATE",
      module: "EMPLOYEE",
      description: `Allowance "${allowance.typeName}" (AED ${allowance.amount}) removed from ${employee.name} (${employee.code})`,
      targetId: employee._id,
      targetName: employee.name
    }).catch(() => {});

    res.json({ employee });
  } catch (error) {
    res.status(500).json({ message: "Server error: " + error.message });
  }
};

export const uploadEmployeePhoto = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions = [], role, employeeId } = req.user;

    if (!req.file) {
      return res.status(400).json({ message: "No photo uploaded" });
    }

    if (!req.file.mimetype?.startsWith("image/")) {
      return res.status(400).json({ message: "Only image files are allowed" });
    }

    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const canManageEmployees = role === "Admin" || permissions.includes("ALL") || permissions.includes("MANAGE_EMPLOYEES");
    const isOwnProfile = employeeId && employeeId.toString() === id;

    if (!canManageEmployees && !isOwnProfile) {
      return res.status(403).json({ message: "Access Denied: You cannot update this profile photo" });
    }

    const stored = await storeUploadedFile({
      file: req.file,
      folder: "employee-photos",
      preferS3: true
    });

    employee.profilePhotoPath = stored.filePath;
    employee.profilePhotoUrl = stored.fileUrl;
    employee.profilePhotoStorage = stored.storage;
    employee.profilePhotoUploadedAt = new Date();
    await employee.save();

    res.json({ success: true, employee: await attachSignedProfilePhotoUrl(employee) });

    logActivity({
      req,
      action: "UPDATE",
      module: "EMPLOYEE",
      description: `Employee ${employee.name} (${employee.code}) profile photo updated`,
      targetId: employee._id,
      targetName: employee.name
    }).catch(() => {});
  } catch (error) {
    res.status(500).json({ message: "Failed to upload employee photo" });
  }
};


export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await Employee.findByIdAndDelete(id);

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.json({ message: "Employee removed successfully" });

    logActivity({
      req,
      action: "DELETE",
      module: "EMPLOYEE",
      description: `Employee ${employee.name} (${employee.code}) deleted`,
      targetId: employee._id,
      targetName: employee.name
    }).catch(() => {});
  } catch (error) {
    // console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Applies any pending (future-dated) transfers whose effectiveDate has now arrived.
 * Mutates the employee in place and persists if anything changed. Called lazily on the
 * main employee read paths so a scheduled transfer takes effect the moment its date passes,
 * without needing a dedicated cron job. Returns true if the employee was changed.
 */
export const applyDuePendingTransfers = async (employee) => {
  if (!employee?.transferHistory?.length) return false;

  const now = new Date();
  // Apply due transfers in chronological order so the latest one wins on company/branch.
  // Only entries explicitly marked applied:false are pending — legacy history predates the
  // field (applied === undefined) and was already applied, so it must NOT be re-applied.
  const due = employee.transferHistory
    .filter((t) => t.applied === false && t.effectiveDate && new Date(t.effectiveDate) <= now)
    .sort((a, b) => new Date(a.effectiveDate) - new Date(b.effectiveDate));

  if (!due.length) return false;

  for (const t of due) {
    if (t.newCompany) employee.company = t.newCompany;
    if (t.newBranch) employee.branch = t.newBranch;
    t.applied = true;
  }

  await employee.save();
  return true;
};

export const transferEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { company, branch, effectiveDate, reason } = req.body;

    if (!effectiveDate) {
      return res.status(400).json({ message: "Effective date is required" });
    }

    const employee = await Employee.findById(id);

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const previousCompany = employee.company || "";
    const previousBranch = employee.branch || "";
    const targetCompany = company !== undefined ? company : previousCompany;
    const targetBranch = branch !== undefined ? branch : previousBranch;

    // Only apply immediately when the effective date is today or in the past. Future-dated
    // transfers are recorded but left pending until their date arrives (see
    // applyDuePendingTransfers), instead of taking effect the instant they're created.
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    const isImmediate = new Date(effectiveDate) <= endOfToday;

    employee.transferHistory.push({
      previousCompany,
      newCompany: targetCompany,
      previousBranch,
      newBranch: targetBranch,
      effectiveDate,
      reason: reason || "",
      transferredBy: req.user._id,
      applied: isImmediate
    });

    if (isImmediate) {
      if (company !== undefined) employee.company = company;
      if (branch !== undefined) employee.branch = branch;
    }

    await employee.save();

    res.json({
      success: true,
      employee,
      scheduled: !isImmediate,
      message: isImmediate
        ? "Transfer applied."
        : `Transfer scheduled for ${new Date(effectiveDate).toISOString().split("T")[0]}. It will take effect on that date.`
    });

    logActivity({
      req,
      action: "TRANSFER",
      module: "EMPLOYEE",
      description: isImmediate
        ? `Employee ${employee.name} (${employee.code}) transferred: ${previousCompany || "—"}/${previousBranch || "—"} → ${targetCompany || "—"}/${targetBranch || "—"}`
        : `Employee ${employee.name} (${employee.code}) transfer scheduled for ${new Date(effectiveDate).toISOString().split("T")[0]}: ${previousCompany || "—"}/${previousBranch || "—"} → ${targetCompany || "—"}/${targetBranch || "—"}`,
      targetId: employee._id,
      targetName: employee.name,
      metadata: {
        effectiveDate,
        applied: isImmediate,
        reason: reason || "",
        from: { company: previousCompany, branch: previousBranch },
        to: { company: targetCompany, branch: targetBranch }
      }
    }).catch(() => {});
  } catch (error) {
    res.status(500).json({ message: "Failed to transfer employee" });
  }
};

export const getProbationReminders = async (req, res) => {
  try {
    const today = new Date();
    const inSevenDays = new Date();
    inSevenDays.setDate(today.getDate() + 7);

    // Don't filter on the stored `probationStatus` field - it's only recalculated
    // when the employee record is saved, so an employee whose probation quietly
    // lapsed without any other edit stays stuck as "ACTIVE" and would be missed.
    // Instead: anyone not yet confirmed, due within 7 days OR already overdue.
    const employees = await Employee.find({
      probationEndDate: { $exists: true, $ne: null, $lte: inSevenDays },
      probationConfirmedAt: null
    }).sort({ probationEndDate: 1 });

    employees.forEach((employee) => {
      employee.probationStatus = getProbationStatus(employee);
    });

    const toNotify = employees.filter((employee) => !employee.probationReminderSentAt);

    for (const employee of toNotify) {
      const admins = await User.find({ role: { $in: ["Admin", "HR Admin", "HR Manager"] } }).select("_id");
      await Promise.all(admins.map((admin) => createNotification({
        recipient: admin._id,
        title: "Probation confirmation due",
        message: `${employee.name} probation ends on ${new Date(employee.probationEndDate).toLocaleDateString()}.`,
        type: "INFO",
        link: `/app/employees/${employee._id}`
      })));
      employee.probationReminderSentAt = new Date();
      await employee.save();
    }

    res.json({ success: true, data: employees });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch probation reminders" });
  }
};

export const confirmProbation = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks = "" } = req.body;
    const employee = await Employee.findById(id);

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    employee.probationStatus = "CONFIRMED";
    employee.probationConfirmedAt = new Date();
    employee.probationConfirmedBy = req.user._id;

    const lastSalaryEntry = [...(employee.salaryHistory || [])]
      .sort((a, b) => new Date(b.effectiveDate) - new Date(a.effectiveDate))[0];
    const currentBasic = toNumber(lastSalaryEntry?.basicSalary || employee.basicSalary);
    const currentVisaBase = toNumber(lastSalaryEntry?.visaBase || employee.visaBase || employee.basicSalary);
    const currentWorkBase = toNumber(lastSalaryEntry?.workBase || employee.workBase || employee.basicSalary);
    const increment = toNumber(employee.fixedProbationIncrementAmount);

    if (increment > 0) {
      employee.basicSalary = String(currentBasic + increment);
      employee.visaBase = currentVisaBase + increment;
      employee.workBase = currentWorkBase + increment;
      employee.totalSalary = computeTotalSalary(employee);
      employee.ctc = computeCtc(employee);
      employee.salaryHistory.push({
        salaryType: "PROBATION_INCREMENT",
        basicSalary: currentBasic + increment,
        visaBase: currentVisaBase + increment,
        workBase: currentWorkBase + increment,
        ctc: employee.ctc,
        incrementAmount: increment,
        effectiveDate: employee.probationEndDate || new Date(),
        notes: remarks || "Probation increment applied",
        createdBy: req.user._id
      });
    }

    await employee.save();

    const linkedUser = await User.findOne({ email: employee.email });
    if (linkedUser) {
      await createNotification({
        recipient: linkedUser._id,
        title: increment > 0 ? "Salary increment applied" : "Probation confirmed",
        message: increment > 0
          ? `Your probation has been confirmed by ${req.user.name || "HR/Admin"}. Salary updated from AED ${currentVisaBase.toFixed(2)} to AED ${(currentVisaBase + increment).toFixed(2)} with an increment of AED ${increment.toFixed(2)}, effective ${new Date(employee.probationEndDate || new Date()).toLocaleDateString()}.`
          : `Your probation has been confirmed by ${req.user.name || "HR/Admin"}.`,
        type: "INFO",
        link: `/app/employees/${employee._id}`
      });
    }

    res.json({ success: true, employee });
  } catch (error) {
    res.status(500).json({ message: "Failed to confirm probation" });
  }
};


export const importEmployees = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    let successCount = 0;
    let errors = [];

    // Pre-fetch all existing emails and phones to minimize DB calls in loop
    const existingEmployees = await Employee.find({}, { email: 1, phone: 1, code: 1 });
    const existingEmails = new Set(existingEmployees.map(e => e.email.toLowerCase()));
    const existingPhones = new Set(existingEmployees.map(e => e.phone));
    const existingCodes = new Set(existingEmployees.map(e => e.code));

    // Pre-fetch Master Data for Strict Validation.
    // Maps are keyed by lowercase name -> canonical Master name, so imported rows get
    // normalized to the Master's exact casing (avoids "Sales & Operations" vs "SALES & OPERATIONS"
    // breaking exact-match filters elsewhere in the app).
    const masters = await Master.find({ isActive: true });
    const canonicalMap = (type) => new Map(masters.filter(m => m.type === type).map(m => [m.name.toLowerCase(), m.name]));
    const validRoles = canonicalMap('ROLE');
    const validDepartments = canonicalMap('DEPARTMENT');
    const validBranches = canonicalMap('BRANCH');
    const validDesignations = canonicalMap('DESIGNATION');
    const validContractTypes = canonicalMap('EMPLOYEE_TYPE');
    const validCompanies = canonicalMap('COMPANY');

    // Branch must belong to the row's Company (Branch.parentId === Company._id), not just exist anywhere.
    const companyIdByName = new Map(masters.filter(m => m.type === 'COMPANY').map(m => [m.name.toLowerCase(), String(m._id)]));
    const branchParentIdByName = new Map(masters.filter(m => m.type === 'BRANCH').map(m => [m.name.toLowerCase(), m.parentId ? String(m.parentId) : null]));

    // WORK LOCATION / VISA LOCATION sometimes hold a Branch name (e.g. "MAIN") scoped to the
    // row's Company, rather than a numeric Company Code ID - keyed by companyId::branchNameLower.
    const branchNameByCompanyIdAndName = new Map();
    masters.filter(m => m.type === 'BRANCH' && m.parentId).forEach(m => {
        branchNameByCompanyIdAndName.set(`${String(m.parentId)}::${m.name.toLowerCase()}`, m.name);
    });

    // Companies map by their "Code ID" (Masters > Company Structure > Companies > Code ID field)
    // WORK LOCATION / VISA LOCATION columns in the import sheet hold this code, not a name.
    const companyByCode = new Map();
    masters.filter(m => m.type === 'COMPANY' && m.code).forEach(m => {
        companyByCode.set(String(m.code).trim(), m.name);
    });

    // The sheet's "COMPANY / BRANCH" column is a single merged field (e.g. "RIZAN HEAD OFFICE").
    // Split it by matching the longest known Company name as a prefix; the remainder is the Branch.
    const companyNamesByLengthDesc = masters
      .filter(m => m.type === 'COMPANY')
      .map(m => m.name)
      .sort((a, b) => b.length - a.length);

    // Excel forces text-formatting on numeric-looking strings with a leading apostrophe
    // (e.g. '784198974152963) - strip it before saving so the stored value is clean.
    const stripExcelTextMarker = (val) => {
      const text = (val ?? "").toString();
      return text.startsWith("'") ? text.slice(1) : text;
    };

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

    // Distinct missing values seen across the whole file, for the summary block
    const missing = {
        departments: new Set(),
        designations: new Set(),
        branches: new Set(),
        companies: new Set(),
        roles: new Set(),
        contractTypes: new Set(),
        workLocationCodes: new Set(),
        visaLocationCodes: new Set()
    };

    // Internal auto-incremented reference number (systemCode), independent of the
    // sheet's optional "Employee Code" column.
    const lastSystemCoded = await Employee.findOne({ systemCode: { $exists: true, $ne: null } }).sort({ systemCode: -1 });
    let lastCodeNum = 0;
    if (lastSystemCoded && lastSystemCoded.systemCode) {
      lastCodeNum = parseInt(lastSystemCoded.systemCode.replace("EMP", ""), 10) || 0;
    }

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2; // Excel row number (1-based, +1 for header)
      let errorMsg = null;

      // 1. Basic Validation
      if (!row["Full Name"] || !row["Email"] || !row["Department"]) {
        errors.push({ row: rowNum, message: "Missing required fields (Name, Email, Department)" });
        continue;
      }

      const email = row["Email"].trim();
      const phone = (row["Contact Number"] || row["Phone"]) ? String(row["Contact Number"] || row["Phone"]).trim() : "";

      // Email Validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push({ row: rowNum, email, message: "Invalid Email format" });
        continue;
      }

      // 2. Duplicate Check - a row whose email already belongs to an employee UPDATES
      // that employee instead of being rejected (re-uploading a corrected sheet after
      // fixing Master data should apply the fix, not skip the row every time).
      const existingEmployeeDoc = existingEmails.has(email.toLowerCase())
        ? await Employee.findOne({ email: { $regex: new RegExp(`^${email}$`, "i") } })
        : null;

      // Phone/Code only block the row if they belong to a DIFFERENT employee than the
      // one we're about to update (or a brand new one on create).
      if (phone && existingPhones.has(phone)) {
        const phoneOwner = await Employee.findOne({ phone });
        if (!existingEmployeeDoc || String(phoneOwner?._id) !== String(existingEmployeeDoc._id)) {
          errors.push({ row: rowNum, email, message: "Phone number already exists" });
          continue;
        }
      }

      const employeeCode = row["Employee Code"] ? row["Employee Code"].toString().trim() : "";
      if (employeeCode && existingCodes.has(employeeCode)) {
        const codeOwner = await Employee.findOne({ code: employeeCode });
        if (!existingEmployeeDoc || String(codeOwner?._id) !== String(existingEmployeeDoc._id)) {
          errors.push({ row: rowNum, email, message: `Employee Code '${employeeCode}' already exists` });
          continue;
        }
      }

      // 3. Strict Master Validation
      let role = row["Role"] ? row["Role"].trim() : "Employee";
      let department = row["Department"].trim();
      // If the sheet has explicit "Company"/"Branch" columns, use them directly.
      // Otherwise split the merged "COMPANY / BRANCH" column against known Company names.
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
        missing.roles.add(role);
        errors.push({ row: rowNum, email, message: `Invalid Role: '${role}'. Exact spelling must match Master list.` });
        continue;
      }
      role = validRoles.get(role.toLowerCase()) || role;

      if (!validDepartments.has(department.toLowerCase())) {
        missing.departments.add(department);
        errors.push({ row: rowNum, email, message: `Invalid Department: '${department}'. Exact spelling must match Master list.` });
        continue;
      }
      department = validDepartments.get(department.toLowerCase());

      if (company && !validCompanies.has(company.toLowerCase())) {
        missing.companies.add(company);
        errors.push({ row: rowNum, email, message: `Invalid Company: '${company}'. Exact spelling must match Master list.` });
        continue;
      }
      if (company) company = validCompanies.get(company.toLowerCase());

      if (branch && !validBranches.has(branch.toLowerCase())) {
        missing.branches.add(branch);
        errors.push({ row: rowNum, email, message: `Invalid Branch: '${branch}'. Exact spelling must match Master list.` });
        continue;
      }
      if (branch) {
        branch = validBranches.get(branch.toLowerCase());
        const branchParentId = branchParentIdByName.get(branch.toLowerCase());
        const companyId = company ? companyIdByName.get(company.toLowerCase()) : null;
        if (company && branchParentId !== companyId) {
          missing.branches.add(`${branch} (not under ${company})`);
          errors.push({ row: rowNum, email, message: `Branch '${branch}' does not belong to Company '${company}'. Nest it under that company under Masters, then re-upload.` });
          continue;
        }
      }

      if (designation && !validDesignations.has(designation.toLowerCase())) {
        missing.designations.add(designation);
        errors.push({ row: rowNum, email, message: `Invalid Designation: '${designation}'. Exact spelling must match Master list.` });
        continue;
      }
      if (designation) designation = validDesignations.get(designation.toLowerCase());

      if (contractType && !validContractTypes.has(contractType.toLowerCase())) {
        missing.contractTypes.add(contractType);
        errors.push({ row: rowNum, email, message: `Invalid Employee Type: '${contractType}'. Exact spelling must match Master list.` });
        continue;
      }
      if (contractType) contractType = validContractTypes.get(contractType.toLowerCase());

      // Resolves a WORK/VISA LOCATION value either as the name of a Branch nested under the
      // row's Company (e.g. "MAIN" - the primary, current convention), a legacy Company Code
      // ID, the full name of a DIFFERENT company entirely (visa sponsorship in a multi-license
      // group - the employee works at one company but their visa is sponsored by another), or
      // any Branch that exists ANYWHERE regardless of which company it's nested under (visa/
      // work location is independent of the employee's own company/branch assignment - it's
      // just recording where the visa or labor card is filed, which can be any real branch in
      // the group). visaCompany/workPermitCompany always end up storing a Branch or Company
      // name string, never an ID. Fills in `branch` from a Branch match ONLY when it's under
      // the row's own company - a global cross-company branch match must never overwrite the
      // employee's actual company/branch assignment.
      const resolveLocationCode = (code) => {
        if (company) {
          const companyId = companyIdByName.get(company.toLowerCase());
          const matchedBranch = companyId ? branchNameByCompanyIdAndName.get(`${companyId}::${code.toLowerCase()}`) : null;
          if (matchedBranch) {
            if (!branch) branch = matchedBranch;
            return { value: matchedBranch };
          }
        }
        const byCompanyCode = companyByCode.get(code);
        if (byCompanyCode) return { value: byCompanyCode };
        const byCompanyName = validCompanies.get(code.toLowerCase());
        if (byCompanyName) return { value: byCompanyName };
        const byAnyBranch = validBranches.get(code.toLowerCase());
        if (byAnyBranch) return { value: byAnyBranch };
        return null;
      };

      let workPermitCompanyName = "";
      if (workLocationCode) {
        const resolved = resolveLocationCode(workLocationCode);
        workPermitCompanyName = resolved?.value || "";
        if (!workPermitCompanyName) {
          missing.workLocationCodes.add(workLocationCode);
          errors.push({ row: rowNum, email, message: `Invalid Work Location: '${workLocationCode}'. No Branch with this name under '${company || "the row's company"}' (or Company Code ID) was found.` });
          continue;
        }
      }

      let visaCompanyName = "";
      if (visaLocationCode) {
        const resolved = resolveLocationCode(visaLocationCode);
        visaCompanyName = resolved?.value || "";
        if (!visaCompanyName) {
          missing.visaLocationCodes.add(visaLocationCode);
          errors.push({ row: rowNum, email, message: `Invalid Visa Location: '${visaLocationCode}'. No Branch with this name under '${company || "the row's company"}' (or Company Code ID) was found.` });
          continue;
        }
      }

      // 4. User Account Creation
      let userPhone = phone.replace(/\s+/g, "");
      if (userPhone.startsWith("0")) {
        userPhone = "+971" + userPhone.substring(1);
      } else if (userPhone.startsWith("971")) {
        userPhone = "+" + userPhone;
      } else if (!userPhone.startsWith("+")) {
        userPhone = "+971" + userPhone;
      }

      const hashedPassword = await bcrypt.hash("Password@123", 10);
      try {
        // Check if user exists (could be a user without employee record)
        const userExists = await User.findOne({ email });
        if (!userExists) {
          await User.create({
            name: row["Full Name"],
            email: email,
            phone: userPhone,
            password: hashedPassword,
            role: role,
            mustChangePassword: true
          });
        }
      } catch (uErr) {
        errors.push({ row: rowNum, email, message: "Failed to create User account: " + uErr.message });
        continue;
      }

      // 4. Employee Creation / Update
      try {
        const nextSystemCode = existingEmployeeDoc
          ? existingEmployeeDoc.systemCode
          : `EMP${String(++lastCodeNum).padStart(3, "0")}`;
        const finalCode = employeeCode || (existingEmployeeDoc ? existingEmployeeDoc.code : nextSystemCode);

        // Date parsing helper. Rejects anything outside a sane year range instead of
        // storing it - a stray large number in a date column (e.g. a phone/ID number
        // mistaken for an Excel serial) previously produced garbage dates like year
        // 20024, which later crashed the export's $dateToString (only supports 0-9999).
        const parseExcelDate = (val) => {
          if (!val) return null;
          const date = typeof val === 'number'
            ? new Date(Math.round((val - 25569) * 86400 * 1000))
            : new Date(val);
          if (isNaN(date.getTime())) return null;
          const year = date.getFullYear();
          if (year < 1900 || year > 2200) return null;
          return date;
        };

        let joinDate = parseExcelDate(row["Joining Date"]) || new Date();
        let passportExpiry = parseExcelDate(row["Passport Expiry"]);
        let emiratesIdExpiry = parseExcelDate(row["Emirates ID Expiry"]);
        let visaExpiry = parseExcelDate(row["Visa Expiry"]);

        const basicSalaryVal = row["Basic Salary (AED)"] ?? row["Basic Salary"];

        // A row's Status column only wins if it's one of the real enum values - a
        // contaminated re-upload (e.g. a previous import-results export with its own
        // "Status"/"Error" columns) can otherwise put error text here, which would
        // reject the whole row on an enum-cast error instead of just keeping status as-is.
        const validStatuses = ["Active", "Inactive", "On Leave", "Onboarding"];
        const sheetStatus = validStatuses.includes(row["Status"]) ? row["Status"] : null;

        const employeeFields = {
          name: row["Full Name"],
          code: finalCode,
          role: role,
          department: department,
          branch: branch,
          company: company,
          email: email,
          phone: phone,
          joinDate: joinDate,
          status: sheetStatus || (existingEmployeeDoc ? existingEmployeeDoc.status : "Onboarding"),
          dob: parseExcelDate(row["Date of Birth"]),
          designation: designation || role,
          shift: row["Shift"] || "Day Shift",
          nationality: row["Nationality"] || "",
          address: row["UAE Address"] || "",
          contractType: contractType || "",
          passportNo: stripExcelTextMarker(row["Passport No"]),
          emiratesIdNo: stripExcelTextMarker(row["Emirates ID No"]),
          basicSalary: basicSalaryVal != null ? String(basicSalaryVal) : "",
          allowance: toNumber(row["Allowance (AED)"]),
          hra: toNumber(row["HRA (AED)"]),
          accommodationAllowance: toNumber(row["ACCOMODATION ALLOWANCE"]),
          vehicleAllowance: toNumber(row["VEHICHLE ALLOWANCE"]),
          visaBase: toNumber(row["Visa Base"] ?? basicSalaryVal),
          workBase: toNumber(row["Work Base"] ?? basicSalaryVal),
          accommodation: row["Accommodation"] || "",
          visaCompany: visaCompanyName || row["Visa Company"] || "",
          workPermitCompany: workPermitCompanyName || row["work permit"] || row["Work Permit Company"] || "",
          visaNo: stripExcelTextMarker(row["Visa No"]),
          visaFileNo: row["Visa File No"] || "",
          laborCardNumber: row["Labor Card No"] || "",
          laborCards: buildLaborCards({ laborCardNumber: row["Labor Card No"] || "" }),
          personalId: stripExcelTextMarker(row["Personal ID (14 Digit)"]),
          bankName: row["Bank Name"] || "",
          iban: stripExcelTextMarker(row["IBAN"]),
          bankAccount: stripExcelTextMarker(row["Account Number"]),
          agentId: row["Agent ID (WPS)"] || "",
          passportExpiry: passportExpiry,
          emiratesIdExpiry: emiratesIdExpiry,
          visaExpiry: visaExpiry,
          fixedProbationIncrementAmount: toNumber(row["Fixed Probation Increment Amount"])
        };

        // Total Salary / CTC are always server-computed, never trusted from the sheet
        // (a "Total Salary (AED)"/"CTC" column may carry stale or manually-typed values).
        employeeFields.totalSalary = computeTotalSalary(employeeFields);
        employeeFields.ctc = computeCtc(employeeFields);

        if (existingEmployeeDoc) {
          // Update path: never touch systemCode (immutable) or salaryHistory/probation
          // confirmation state (real history, not something a re-upload should overwrite).
          await Employee.findByIdAndUpdate(existingEmployeeDoc._id, employeeFields);
        } else {
          await Employee.create({
            ...employeeFields,
            systemCode: nextSystemCode,
            probationStartDate: joinDate,
            probationEndDate: parseExcelDate(row["Probation End Date"]),
            probationStatus: getProbationStatus({ probationEndDate: parseExcelDate(row["Probation End Date"]) }),
            salaryHistory: buildInitialSalaryHistory({
              basicSalary: basicSalaryVal,
              visaBase: row["Visa Base"] ?? basicSalaryVal,
              workBase: row["Work Base"] ?? basicSalaryVal,
              ctc: employeeFields.ctc,
              joinDate
            })
          });
        }

        // Add to local sets to prevent duplicates within the same file
        existingEmails.add(email.toLowerCase());
        if (phone) existingPhones.add(phone);
        existingCodes.add(finalCode);

        successCount++;

      } catch (dbErr) {
        errors.push({ row: rowNum, email, message: "Database Error: " + dbErr.message });
      }
    }

    // Batch summary: distinct missing master values across the whole file,
    // so the user knows exactly what to add to Masters before re-uploading.
    const summary = [];
    const summarize = (label, set, hint) => {
      if (set.size > 0) {
        summary.push(`${label} not found in master data: ${[...set].join(", ")}. ${hint}`);
      }
    };
    summarize("Companies", missing.companies, "Add these under Masters → Company Structure → Companies, then re-upload.");
    summarize("Branches", missing.branches, "Add these under Masters → Company Structure → Branches, then re-upload.");
    summarize("Departments", missing.departments, "Add these under Masters → Company Structure → Departments, then re-upload.");
    summarize("Designations", missing.designations, "Add these under Masters → HR Management → Designations, then re-upload.");
    summarize("Roles", missing.roles, "Add these under Masters → HR Management → Roles, then re-upload.");
    summarize("Employee Types", missing.contractTypes, "Add these under Masters → HR Management → Employee Types, then re-upload.");
    summarize("Work Location codes", missing.workLocationCodes, "Set the matching Company's Code ID under Masters → Company Structure → Companies, then re-upload.");
    summarize("Visa Location codes", missing.visaLocationCodes, "Set the matching Company's Code ID under Masters → Company Structure → Companies, then re-upload.");

    res.json({
      message: "Import processing processed",
      successCount,
      failureCount: errors.length,
      summary,
      errors
    });

  } catch (error) {
    console.error("Import Error:", error);
    res.status(500).json({ message: "Server error during import" });
  }
};

// Parses a Shift-import sheet ("Employee Code" + "Shift" columns), matching each row
// against existing Employees (by code) and Shift masters (by name), without writing anything.
// Shared by previewShiftImport and applyShiftImport so both calls resolve rows identically.
const parseShiftImportRows = async (buffer) => {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);

  const employees = await Employee.find({}, { code: 1, name: 1, shift: 1 });
  const employeeByCode = new Map(
    employees.map((e) => [String(e.code || "").trim().toLowerCase(), e])
  );

  const shiftMasters = await Master.find({ type: "SHIFT", isActive: true });
  const shiftByName = new Map(
    shiftMasters.map((m) => [m.name.trim().toLowerCase(), m.name])
  );

  const rows = data.map((row, i) => {
    const rowNum = i + 2; // Excel row number (1-based, +1 for header)
    const employeeCode = row["Employee Code"] != null ? String(row["Employee Code"]).trim() : "";
    const shiftName = row["Shift"] != null ? String(row["Shift"]).trim() : "";

    if (!employeeCode || !shiftName) {
      return {
        row: rowNum,
        employeeCode,
        shiftName,
        employee: null,
        matchedShift: null,
        status: "error",
        message: "Missing required Employee Code or Shift"
      };
    }

    const employee = employeeByCode.get(employeeCode.toLowerCase());
    const matchedShift = shiftByName.get(shiftName.toLowerCase()) || null;

    if (!employee) {
      return {
        row: rowNum,
        employeeCode,
        shiftName,
        employee: null,
        matchedShift,
        status: "error",
        message: `No employee found with code '${employeeCode}'`
      };
    }

    if (!matchedShift) {
      return {
        row: rowNum,
        employeeCode,
        shiftName,
        employee: { id: employee._id, name: employee.name, currentShift: employee.shift },
        matchedShift: null,
        status: "error",
        message: `Unknown shift '${shiftName}' — no matching Shift master`
      };
    }

    return {
      row: rowNum,
      employeeCode,
      shiftName,
      employee: { id: employee._id, name: employee.name, currentShift: employee.shift },
      matchedShift,
      status: "ok"
    };
  });

  const summary = {
    total: rows.length,
    ok: rows.filter((r) => r.status === "ok").length,
    errors: rows.filter((r) => r.status === "error").length
  };

  return { rows, summary };
};

export const previewShiftImport = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const { rows, summary } = await parseShiftImportRows(req.file.buffer);
    res.json({ rows, summary });
  } catch (error) {
    console.error("Preview shift import error:", error);
    res.status(500).json({ message: "Server error during shift import preview" });
  }
};

export const applyShiftImport = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const { rows } = await parseShiftImportRows(req.file.buffer);

    let updated = 0;
    const errors = [];

    for (const r of rows) {
      if (r.status !== "ok") {
        errors.push({ row: r.row, message: r.message || "Skipped" });
        continue;
      }
      await Employee.updateOne({ _id: r.employee.id }, { $set: { shift: r.matchedShift } });
      updated++;
    }

    res.json({
      message: "Shift import complete",
      updated,
      skipped: errors.length,
      errors
    });
  } catch (error) {
    console.error("Apply shift import error:", error);
    res.status(500).json({ message: "Server error during shift import" });
  }
};

export const resetEmployeePassword = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the employee
    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Find the associated user. employeeId is the authoritative link, but two known
    // gaps can leave it unset even though the employee is legitimate:
    //   1. Bulk import (importEmployees) creates the User but never sets employeeId.
    //   2. Editing an employee's email later (updateEmployee) never updates the linked
    //      User's email, orphaning it under the stale address.
    // Rather than just erroring, heal the link (User exists by email, just unlinked) or
    // provision a fresh account (no User exists under this email at all) so "Reset
    // Password" also fixes the underlying account gap it's exposing, not just report it.
    let user = await User.findOne({ employeeId: id });

    if (!user && employee.email) {
      user = await User.findOne({ email: employee.email });
      if (user) {
        user.employeeId = employee._id;
        await user.save();
      }
    }

    if (!user) {
      if (!employee.email) {
        return res.status(404).json({ message: "Linked user account not found for this employee, and no email is on file to provision one. Add an email to this employee's profile first." });
      }

      let userPhone = (employee.phone || "").replace(/\s+/g, "");
      if (userPhone.startsWith("0")) {
        userPhone = "+971" + userPhone.substring(1);
      } else if (userPhone.startsWith("971")) {
        userPhone = "+" + userPhone;
      } else if (userPhone && !userPhone.startsWith("+")) {
        userPhone = "+971" + userPhone;
      }

      try {
        const hashedPassword = await bcrypt.hash("Password@123", 10);
        user = await User.create({
          name: employee.name,
          email: employee.email,
          phone: userPhone,
          password: hashedPassword,
          role: employee.role,
          employeeId: employee._id,
          mustChangePassword: true
        });
      } catch (provisionErr) {
        if (provisionErr.code === 11000) {
          return res.status(409).json({ message: "Could not provision a login account for this employee: the email or phone number is already used by another account. Resolve that conflict first, then try again." });
        }
        return res.status(500).json({ message: "Could not provision a login account for this employee: " + provisionErr.message });
      }
    }

    // Generate random 8-char password
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let newPassword = "";
    for (let i = 0; i < 8; i++) {
        newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Hash it and save
    user.password = await bcrypt.hash(newPassword, 10);
    user.mustChangePassword = true;
    await user.save();

    // Email the employee
    const emailOptions = {
        to: employee.email,
        subject: "Administrator Triggered Password Reset - HRMS",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                <div style="background-color: #ef4444; color: white; padding: 20px; text-align: center;">
                    <h2 style="margin: 0;">Password Reset</h2>
                </div>
                <div style="padding: 20px; background-color: #ffffff; color: #333333;">
                    <p style="font-size: 16px;">Hello <strong>${employee.name}</strong>,</p>
                    <p style="font-size: 16px;">Your administrator has manually reset your HRMS account password.</p>
                     
                    <div style="margin: 20px 0; padding: 15px; background-color: #f1f5f9; border-left: 4px solid #3b82f6; border-radius: 4px;">
                        <span style="font-size: 14px; color: #64748b; text-transform: uppercase;">Your New Temporary Password:</span>
                        <div style="font-size: 24px; font-weight: bold; font-family: monospace; color: #0f172a; margin-top: 5px;">${newPassword}</div>
                    </div>
                </div>
                <div style="background-color: #f8fafc; padding: 15px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="font-size: 12px; color: #64748b; margin: 0;">Please log into your account and change this temporary password immediately inside your Profile Settings.</p>
                </div>
            </div>
        `
    };

    const emailResult = await sendEmail(emailOptions);

    if (!emailResult.success) {
      return res.status(500).json({ message: "Password was reset but failed to send email. The temporary password is: " + newPassword });
    }

    res.status(200).json({ message: "Password reset successfully and email dispatched to employee." });
  } catch (error) {
    console.error("Reset Password Error:", error);
    res.status(500).json({ message: "Server error resetting password", error: error.message });
  }
};

/**
 * Calculate UAE Gratuity (End-of-Service Benefit) for an employee
 * Formula (Federal Decree-Law No. 33 of 2021):
 *   Daily Basic Wage = Monthly Basic Salary / 30
 *   ≤ 5 years: Daily Wage × 21 × Years of Service
 *   > 5 years: (Daily Wage × 21 × 5) + (Daily Wage × 30 × (Years − 5))
 *   Capped at 2 years' total salary
 */
export const getEmployeeGratuity = async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const basicSalary = Number(employee.basicSalary) || 0;
    const accommodationAllowance = Number(employee.accommodationAllowance) || 0;
    const vehicleAllowance = Number(employee.vehicleAllowance) || 0;
    const fixedProbationIncrement = Number(employee.fixedProbationIncrementAmount) || 0;
    // Gratuity cap uses full compensation (CTC), not the narrower Total Salary figure -
    // employee.ctc is server-recomputed on every save (see updateEmployee), so it's
    // always authoritative; computeCtc is the fallback for any employee predating that.
    const totalSalary = Number(employee.ctc) || computeCtc(employee);

    // Calculate years of service
    const joinDate = employee.joinDate ? new Date(employee.joinDate) : null;
    const today = new Date();
    let yearsOfService = 0;
    let monthsOfService = 0;
    let daysOfService = 0;

    if (joinDate) {
      const diffMs = today - joinDate;
      daysOfService = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      monthsOfService = Math.floor(daysOfService / 30.44);
      yearsOfService = daysOfService / 365.25; // fractional years for calculation
    }

    // Gratuity is only applicable for employees with > 1 year of service
    let gratuityAmount = 0;
    let gratuityNote = "";

    if (yearsOfService < 1) {
      gratuityNote = "Gratuity not applicable — less than 1 year of service";
    } else {
      const dailyBasicWage = basicSalary / 30;

      if (yearsOfService <= 5) {
        gratuityAmount = dailyBasicWage * 21 * yearsOfService;
      } else {
        const first5Years = dailyBasicWage * 21 * 5;
        const beyond5Years = dailyBasicWage * 30 * (yearsOfService - 5);
        gratuityAmount = first5Years + beyond5Years;
      }

      // Cap at 2 years' total salary
      const cap = totalSalary * 24; // 2 years = 24 months
      if (gratuityAmount > cap) {
        gratuityAmount = cap;
        gratuityNote = "Capped at 2 years' total salary";
      }
    }

    res.status(200).json({
      success: true,
      data: {
        employeeId: employee._id,
        employeeName: employee.name,
        joinDate: employee.joinDate,
        yearsOfService: parseFloat(yearsOfService.toFixed(2)),
        monthsOfService,
        daysOfService,
        basicSalary,
        accommodationAllowance,
        vehicleAllowance,
        fixedProbationIncrement,
        totalSalary,
        dailyBasicWage: parseFloat((basicSalary / 30).toFixed(2)),
        gratuityAmount: parseFloat(gratuityAmount.toFixed(2)),
        gratuityNote
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Server error calculating gratuity" });
  }
};
