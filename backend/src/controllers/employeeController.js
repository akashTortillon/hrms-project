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
    console.error("Export Error:", error);
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

    // 4. Create Employee
    const employee = await Employee.create({
      name,
      code: nextCode,
      role,
      department,
      email,
      phone,
      joinDate,
      status: status || "Active"
    });

    // 5. Auto-create User account for login
    // Normalize phone for User model (+971 format)
    let userPhone = phone.replace(/\s+/g, "");
    if (userPhone.startsWith("0")) {
      userPhone = "+971" + userPhone.substring(1);
    } else if (userPhone.startsWith("971")) {
      userPhone = "+" + userPhone;
    }

    const userExists = await User.findOne({ email });
    let userCreated = false;
    let userCreationError = "";

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
        userCreated = true;
      } catch (uErr) {
        console.error("User creation failed:", uErr.message);
        userCreationError = " (Login account failed: " + uErr.message + ")";
      }
    }

    res.status(201).json({
      message: userCreated
        ? "Employee added & User account created (Password: Password@123)"
        : "Employee added" + userCreationError,
      employee
    });
  } catch (error) {
    console.error("Add Employee Error:", error);
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
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};



export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedEmployee = await Employee.findByIdAndUpdate(
      id,
      req.body,
      { new: true }
    );

    if (!updatedEmployee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.json({ employee: updatedEmployee });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
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
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

