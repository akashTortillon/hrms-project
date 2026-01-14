import Employee from "../models/employeeModel.js";
import User from "../models/userModel.js";
import bcrypt from "bcryptjs";

export const addEmployee = async (req, res) => {
  try {
    const { name, code, role, department, email, phone, joinDate, status } = req.body;

    // Validation
    if (!name || !role || !department || !email || !phone || !joinDate) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Generate Auto Incremented EMP Code
    const lastEmployee = await Employee.findOne().sort({ code: -1 });
    let nextCode = "EMP001";

    if (lastEmployee && lastEmployee.code) {
      const lastNumber = parseInt(lastEmployee.code.replace("EMP", ""), 10);
      if (!isNaN(lastNumber)) {
        nextCode = `EMP${String(lastNumber + 1).padStart(3, "0")}`;
      }
    }

    // Check if email already exists

    // Check if email already exists
    const existingEmail = await Employee.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({ message: "Email already exists" });
    }

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

    // ✅ Auto-create User account for login
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
    // Handle duplicate key checks if they slipped through
    if (error.code === 11000) {
      return res.status(409).json({ message: "Duplicate entry found (Email or Phone)" });
    }
    res.status(500).json({ message: "Server error: " + error.message });
  }
};

export const getEmployees = async (req, res) => {
  try {
    const employees = await Employee.aggregate([
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

