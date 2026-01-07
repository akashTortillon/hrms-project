import Employee from "../models/employeeModel.js";

export const addEmployee = async (req, res) => {
  try {
    const { name, code, role, department, email, phone, joinDate, status } = req.body;

    // Validation
    if (!name || !code || !role || !department || !email || !phone || !joinDate) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if employee code already exists
    const existingEmployee = await Employee.findOne({ code });
    if (existingEmployee) {
      return res.status(409).json({ message: "Employee code already exists" });
    }

    // Check if email already exists
    const existingEmail = await Employee.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const employee = await Employee.create({
      name,
      code,
      role,
      department,
      email,
      phone,
      joinDate,
      status: status || "Active"
    });

    res.status(201).json({
      message: "Employee added successfully",
      employee
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find().sort({ code: -1 });
    res.json(employees);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};