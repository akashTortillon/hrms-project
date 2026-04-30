import * as XLSX from "xlsx";
import Employee from "../models/employeeModel.js";
import Master from "../models/masterModel.js";
import { createNotification } from "./notificationController.js";
import User from "../models/userModel.js";
import bcrypt from "bcryptjs";
import { sendEmail } from "../utils/sendEmail.js";
import { logActivity } from "../utils/activityLogger.js";
import { getSignedFileUrl, storeUploadedFile } from "../utils/storage.js";

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  return Number(String(value).replace(/[^0-9.-]+/g, "")) || 0;
};

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

const resolveManagerUserId = async (designatedManager) => {
  if (!designatedManager) return null;

  const directUser = await User.findById(designatedManager).select("_id");
  if (directUser) {
    return directUser._id;
  }

  const linkedUser = await User.findOne({ employeeId: designatedManager }).select("_id");
  return linkedUser?._id || null;
};

const resolveFinanceManagerUserId = async (designatedFinanceManager) => {
  if (!designatedFinanceManager) return null;

  const directUser = await User.findById(designatedFinanceManager).select("_id");
  if (directUser) {
    return directUser._id;
  }

  const linkedUser = await User.findOne({ employeeId: designatedFinanceManager }).select("_id");
  return linkedUser?._id || null;
};

const attachSignedProfilePhotoUrl = async (employee) => {
  const item = employee.toObject ? employee.toObject() : { ...employee };
  item.profilePhotoUrl = await getSignedFileUrl({
    filePath: item.profilePhotoPath,
    fileUrl: item.profilePhotoUrl,
    storage: item.profilePhotoStorage
  });
  return item;
};

export const exportEmployees = async (req, res) => {
  try {
    const { department, status, search, branch } = req.query;

    let matchStage = {};

    // Filter by Branch
    if (branch && branch !== "All Branches") {
      matchStage.branch = branch;
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

    const employees = await Employee.aggregate([
      { $match: matchStage },
      { $sort: { code: 1 } },
      {
        $project: {
          _id: 0,
          "Employee ID": "$code",
          "Full Name": "$name",
          "Role": "$role",
          "Department": "$department",
          "Branch": "$branch",
          "Company": "$company",
          "Email": "$email",
          "Contact Number": "$phone",
          "Visa Company": "$visaCompany",
          "Work Permit Company": "$workPermitCompany",
          "Visa No": "$visaNo",
          "Visa File No": "$visaFileNo",
          "Visa Expiry": {
            $dateToString: { format: "%Y-%m-%d", date: "$visaExpiry" }
          },
          "Visa Base": "$visaBase",
          "Work Base": "$workBase",
          "Joining Date": {
            $dateToString: { format: "%Y-%m-%d", date: "$joinDate" }
          },
          "Status": "$status"
        }
      }
    ]);

    const worksheet = XLSX.utils.json_to_sheet(employees);
    // Auto-width columns
    const maxWidth = employees.reduce((w, r) => Math.max(w, r["Full Name"] ? r["Full Name"].length : 10), 10);
    worksheet["!cols"] = [
      { wch: 10 }, // ID
      { wch: 25 }, // Name
      { wch: 20 }, // Role
      { wch: 15 }, // Dept
      { wch: 15 }, // Branch
      { wch: 20 }, // Company
      { wch: 30 }, // Email
      { wch: 15 }, // Phone
      { wch: 12 }, // Visa Base
      { wch: 12 }, // Work Base
      { wch: 15 }, // Date
      { wch: 10 }  // Status
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");

    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

    res.setHeader("Content-Disposition", 'attachment; filename="Employees.xlsx"');
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);

  } catch (error) {
    // console.error("Export Error:", error);
    res.status(500).json({ message: "Export failed" });
  }
};

export const addEmployee = async (req, res) => {
  try {
    const {
      name,
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
    if (!role) return res.status(400).json({ message: "Role is required" });
    if (!department) return res.status(400).json({ message: "Department is required" });
    if (!joinDate) return res.status(400).json({ message: "Joining Date is required" });

    // Email Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ message: "Valid Email is required" });
    }

    // Phone Validation (UAE Format)
    // Relaxed to support various lengths (landline, mobile, potential extra prefixing)
    // Checks for UAE prefix (+971, 00971, 971, 0) followed by 7-12 digits
    const uaePhoneRegex = /^(?:\+971|00971|971|0)?\d{7,12}$/;

    // Sanitize spaces/dashes before check
    const cleanPhone = phone ? phone.replace(/[\s-]/g, '') : '';

    if (!cleanPhone || !uaePhoneRegex.test(cleanPhone)) {
      return res.status(400).json({ message: "Valid UAE Phone Number is required" });
    }

    // 2. Check for Duplicates (Email or Phone)
    const existingEmployee = await Employee.findOne({
      $or: [{ email: email }, { phone: phone }]
    });

    if (existingEmployee) {
      if (existingEmployee.email === email) return res.status(409).json({ message: "Email already exists" });
      if (existingEmployee.phone === phone) return res.status(409).json({ message: "Phone number already exists" });
    }

    const resolvedDesignatedManager = await resolveManagerUserId(designatedManager);
    const resolvedDesignatedFinanceManager = await resolveFinanceManagerUserId(designatedFinanceManager);

    // 3. Generate Auto Incremented EMP Code
    const lastEmployee = await Employee.findOne().sort({ code: -1 });
    let nextCode = "EMP001";

    if (lastEmployee && lastEmployee.code) {
      const lastNumber = parseInt(lastEmployee.code.replace("EMP", ""), 10);
      if (!isNaN(lastNumber)) {
        nextCode = `EMP${String(lastNumber + 1).padStart(3, "0")}`;
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
          role: role
        });
        createdUser = true;
      } catch (uErr) {
        // console.error("User creation failed:", uErr.message);
        return res.status(500).json({ message: "Failed to create User account. Employee not added." });
      }
    }

    // 5. Create Employee (Only if User valid)
    const employee = await Employee.create({
      name,
      code: nextCode,
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
      visaBase: toNumber(visaBase || basicSalary),
      workBase: toNumber(workBase || basicSalary),
      ctc: toNumber(ctc || workBase || basicSalary),
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
        ctc,
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
    const { department, status, search, branch } = req.query;

    let matchStage = {};

    // Filter by Branch
    if (branch && branch !== "All Branches") {
      matchStage.branch = branch;
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

    res.json(await attachSignedProfilePhotoUrl(employee));
  } catch (error) {
    // console.error("Get Employee By ID Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, email, phone } = req.body;

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

    const payload = { ...req.body };

    if (payload.designatedManager !== undefined) {
      payload.designatedManager = await resolveManagerUserId(payload.designatedManager);
    }
    if (payload.designatedFinanceManager !== undefined) {
      payload.designatedFinanceManager = await resolveFinanceManagerUserId(payload.designatedFinanceManager);
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

    const updatedEmployee = await Employee.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true
    });

    if (!updatedEmployee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Sync Role with User account
    if (role && updatedEmployee.email) {
      // Find linked User by email and update role
      await User.findOneAndUpdate(
        { email: updatedEmployee.email },
        { role: role }
      );
    }

    if (req.body.appendSalaryHistory) {
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

    logActivity({
      req,
      action: "UPDATE",
      module: "EMPLOYEE",
      description: `Employee ${updatedEmployee.name} (${updatedEmployee.code}) updated`,
      targetId: updatedEmployee._id,
      targetName: updatedEmployee.name
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

    employee.transferHistory.push({
      previousCompany: employee.company || "",
      newCompany: company || employee.company || "",
      previousBranch: employee.branch || "",
      newBranch: branch || employee.branch || "",
      effectiveDate,
      reason: reason || "",
      transferredBy: req.user._id
    });

    if (company !== undefined) employee.company = company;
    if (branch !== undefined) employee.branch = branch;

    await employee.save();

    res.json({ success: true, employee });
  } catch (error) {
    res.status(500).json({ message: "Failed to transfer employee" });
  }
};

export const getProbationReminders = async (req, res) => {
  try {
    const today = new Date();
    const inSevenDays = new Date();
    inSevenDays.setDate(today.getDate() + 7);

    const employees = await Employee.find({
      probationEndDate: { $gte: today, $lte: inSevenDays },
      probationStatus: { $in: ["ACTIVE", "PENDING_CONFIRMATION"] }
    }).sort({ probationEndDate: 1 });

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
    const currentCtc = toNumber(lastSalaryEntry?.ctc || employee.ctc || employee.workBase || employee.basicSalary);
    const increment = toNumber(employee.fixedProbationIncrementAmount);

    if (increment > 0) {
      employee.basicSalary = String(currentBasic + increment);
      employee.visaBase = currentVisaBase + increment;
      employee.workBase = currentWorkBase + increment;
      employee.ctc = currentCtc + increment;
      employee.salaryHistory.push({
        salaryType: "PROBATION_INCREMENT",
        basicSalary: currentBasic + increment,
        visaBase: currentVisaBase + increment,
        workBase: currentWorkBase + increment,
        ctc: currentCtc + increment,
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

    // Pre-fetch Master Data for Strict Validation
    const masters = await Master.find({ isActive: true });
    const validRoles = new Set(masters.filter(m => m.type === 'ROLE').map(m => m.name.toLowerCase()));
    const validDepartments = new Set(masters.filter(m => m.type === 'DEPARTMENT').map(m => m.name.toLowerCase()));
    const validBranches = new Set(masters.filter(m => m.type === 'BRANCH').map(m => m.name.toLowerCase()));
    const validDesignations = new Set(masters.filter(m => m.type === 'DESIGNATION').map(m => m.name.toLowerCase()));
    const validContractTypes = new Set(masters.filter(m => m.type === 'EMPLOYEE_TYPE').map(m => m.name.toLowerCase()));

    // Get last employee code
    const lastEmployee = await Employee.findOne().sort({ code: -1 });
    let lastCodeNum = 0;
    if (lastEmployee && lastEmployee.code) {
      lastCodeNum = parseInt(lastEmployee.code.replace("EMP", ""), 10) || 0;
    }

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2; // Excel row number (1-based, +1 for header)
      let errorMsg = null;

      // 1. Basic Validation
      if (!row["Full Name"] || !row["Email"] || !row["Role"] || !row["Department"]) {
        errors.push({ row: rowNum, message: "Missing required fields (Name, Email, Role, Department)" });
        continue;
      }

      const email = row["Email"].trim();
      const phone = row["Phone"] ? String(row["Phone"]).trim() : "";

      // Email Validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push({ row: rowNum, email, message: "Invalid Email format" });
        continue;
      }

      // 2. Duplicate Check
      if (existingEmails.has(email.toLowerCase())) {
        errors.push({ row: rowNum, email, message: "Email already exists" });
        continue;
      }
      if (phone && existingPhones.has(phone)) {
        errors.push({ row: rowNum, email, message: "Phone number already exists" });
        continue;
      }

      // 3. Strict Master Validation
      const role = row["Role"].trim();
      const department = row["Department"].trim();
      const branch = row["Branch"] ? row["Branch"].trim() : "";
      const designation = row["Designation"] ? row["Designation"].trim() : "";
      const contractType = row["Employee Type"] ? row["Employee Type"].trim() : "";

      if (!validRoles.has(role.toLowerCase())) {
        errors.push({ row: rowNum, email, message: `Invalid Role: '${role}'. Exact spelling must match Master list.` });
        continue;
      }
      if (!validDepartments.has(department.toLowerCase())) {
        errors.push({ row: rowNum, email, message: `Invalid Department: '${department}'. Exact spelling must match Master list.` });
        continue;
      }
      if (branch && !validBranches.has(branch.toLowerCase())) {
        errors.push({ row: rowNum, email, message: `Invalid Branch: '${branch}'. Exact spelling must match Master list.` });
        continue;
      }
      if (designation && !validDesignations.has(designation.toLowerCase())) {
        errors.push({ row: rowNum, email, message: `Invalid Designation: '${designation}'. Exact spelling must match Master list.` });
        continue;
      }
      if (contractType && !validContractTypes.has(contractType.toLowerCase())) {
        errors.push({ row: rowNum, email, message: `Invalid Employee Type: '${contractType}'. Exact spelling must match Master list.` });
        continue;
      }

      // 4. User Account Creation
      let userPhone = phone.replace(/\s+/g, "");
      // Simple normalization for UAE if needed, or just keep as is

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
            role: row["Role"]
          });
        }
      } catch (uErr) {
        errors.push({ row: rowNum, email, message: "Failed to create User account: " + uErr.message });
        continue;
      }

      // 4. Employee Creation
      try {
        lastCodeNum++;
        const nextCode = `EMP${String(lastCodeNum).padStart(3, "0")}`;

        // Date parsing helper
        const parseExcelDate = (val) => {
          if (!val) return null;
          if (typeof val === 'number') {
            return new Date(Math.round((val - 25569) * 86400 * 1000));
          }
          return new Date(val);
        };

        let joinDate = parseExcelDate(row["Joining Date"]) || new Date();
        let passportExpiry = parseExcelDate(row["Passport Expiry"]);
        let emiratesIdExpiry = parseExcelDate(row["Emirates ID Expiry"]);
        let visaExpiry = parseExcelDate(row["Visa Expiry"]);

        await Employee.create({
          name: row["Full Name"],
          code: nextCode,
          role: row["Role"],
          department: row["Department"],
          branch: row["Branch"] || "",
          company: row["Company"] || "",
          email: email,
          phone: phone,
          joinDate: joinDate,
          status: row["Status"] || "Onboarding",
          designation: row["Designation"] || row["Role"],
          shift: row["Shift"] || "Day Shift", // Default
          nationality: row["Nationality"] || "",
          address: row["UAE Address"] || "",
          contractType: row["Employee Type"] || "",
          basicSalary: row["Basic Salary"] ? String(row["Basic Salary"]) : "",
          visaBase: toNumber(row["Visa Base"] || row["Basic Salary"]),
          workBase: toNumber(row["Work Base"] || row["Basic Salary"]),
          ctc: toNumber(row["CTC"] || row["Work Base"] || row["Basic Salary"]),
          accommodation: row["Accommodation"] || "",
          visaCompany: row["Visa Company"] || "",
          workPermitCompany: row["Work Permit Company"] || "",
          visaNo: row["Visa No"] || "",
          visaFileNo: row["Visa File No"] || "",
          laborCardNumber: row["Labor Card No"] || "",
          laborCards: buildLaborCards({ laborCardNumber: row["Labor Card No"] || "" }),
          personalId: row["Personal ID (14 Digit)"] || "",
          bankName: row["Bank Name"] || "",
          iban: row["IBAN"] || "",
          bankAccount: row["Account Number"] || "",
          agentId: row["Agent ID (WPS)"] || "",
          passportExpiry: passportExpiry,
          emiratesIdExpiry: emiratesIdExpiry,
          visaExpiry: visaExpiry,
          probationStartDate: joinDate,
          probationEndDate: parseExcelDate(row["Probation End Date"]),
          probationStatus: getProbationStatus({ probationEndDate: parseExcelDate(row["Probation End Date"]) }),
          fixedProbationIncrementAmount: toNumber(row["Fixed Probation Increment Amount"]),
          salaryHistory: buildInitialSalaryHistory({
            basicSalary: row["Basic Salary"],
            visaBase: row["Visa Base"] || row["Basic Salary"],
            workBase: row["Work Base"] || row["Basic Salary"],
            ctc: row["CTC"] || row["Work Base"] || row["Basic Salary"],
            joinDate
          })
        });

        // Add to local sets to prevent duplicates within the same file
        existingEmails.add(email.toLowerCase());
        if (phone) existingPhones.add(phone);

        successCount++;

      } catch (dbErr) {
        errors.push({ row: rowNum, email, message: "Database Error: " + dbErr.message });
      }
    }

    res.json({
      message: "Import processing processed",
      successCount,
      failureCount: errors.length,
      errors
    });

  } catch (error) {
    // console.error("Import Error:", error);
    res.status(500).json({ message: "Server error during import" });
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

    // Find the associated user
    const user = await User.findOne({ employeeId: id });
    if (!user) {
      return res.status(404).json({ message: "Linked user account not found for this employee." });
    }

    // Generate random 8-char password
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let newPassword = "";
    for (let i = 0; i < 8; i++) {
        newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Hash it and save
    user.password = await bcrypt.hash(newPassword, 10);
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
    const totalSalary = Number(employee.totalSalary) || (basicSalary + accommodationAllowance + vehicleAllowance);

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
