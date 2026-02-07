import * as XLSX from "xlsx";
import Employee from "../models/employeeModel.js";

export const exportEmployees = async (req, res) => {
  try {
    const { department, status, search } = req.query;

    let matchStage = {};

    // Filter by Department
    if (department && department !== "All Departments") {
      matchStage.department = department;
    }

    // Filter by Status
    if (status && status !== "All Status") {
      matchStage.status = status;
    }

    // Filter by Search (Name, Email, Code)
    if (search) {
      matchStage.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
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
          "Email": "$email",
          "Contact Number": "$phone",
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
      { wch: 30 }, // Email
      { wch: 15 }, // Phone
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
import User from "../models/userModel.js";
import bcrypt from "bcryptjs";

export const addEmployee = async (req, res) => {
  try {
    const { name, code, role, department, email, phone, joinDate, status } = req.body;

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
    const {
      dob, nationality, address, passportExpiry, emiratesIdExpiry,
      designation, contractType, basicSalary, accommodation, visaExpiry, shift
    } = req.body;

    const employee = await Employee.create({
      name,
      code: nextCode,
      role,
      department,
      email,
      phone,
      joinDate,
      status: status || "Onboarding",
      dob, nationality, address, passportExpiry, emiratesIdExpiry,
      designation, contractType, basicSalary, accommodation, visaExpiry,
      shift: shift || "Day Shift"
    });

    res.status(201).json({
      message: createdUser
        ? "Employee added & User account created (Password: Password@123)"
        : "Employee added (User account already existed)",
      employee
    });
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
    const { department, status, search } = req.query;

    let matchStage = {};

    // Filter by Department
    if (department && department !== "All Departments") {
      matchStage.department = department;
    }

    // Filter by Status
    if (status && status !== "All Status") {
      matchStage.status = status;
    }

    // Filter by Search (Name, Email, Code)
    if (search) {
      matchStage.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } }
      ];
    }

    const employees = await Employee.aggregate([
      { $match: matchStage }, // Apply filters first
      {
        $addFields: {
          numericCode: {
            $toInt: {
              $substr: ["$code", 3, -1]
            }
          }
        }
      },
      { $sort: { numericCode: 1 } },
      { $project: { numericCode: 0 } }
    ]);


    res.json(employees);
  } catch (error) {
    // console.error(error);
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

    res.json(employee);
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

    const updatedEmployee = await Employee.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );

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

    res.json({ employee: updatedEmployee });
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


export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await Employee.findByIdAndDelete(id);

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.json({ message: "Employee removed successfully" });
  } catch (error) {
    // console.error(error);
    res.status(500).json({ message: "Server error" });
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

      // 3. User Account Creation
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

        // Parse Date - Excel dates can be tricky. 
        // If it's a number (Excel serial date), convert. If string, try parsing.
        let joinDate = new Date();
        if (row["Joining Date"]) {
          if (typeof row["Joining Date"] === 'number') {
            joinDate = new Date(Math.round((row["Joining Date"] - 25569) * 86400 * 1000));
          } else {
            joinDate = new Date(row["Joining Date"]);
          }
        }

        await Employee.create({
          name: row["Full Name"],
          code: nextCode,
          role: row["Role"],
          department: row["Department"],
          email: email,
          phone: phone,
          joinDate: joinDate,
          status: row["Status"] || "Onboarding",
          designation: row["Designation"] || row["Role"],
          shift: "Day Shift" // Default
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
