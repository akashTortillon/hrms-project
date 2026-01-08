import Employee from "../models/employeeModel.js";

export const addEmployee = async (req, res) => {
  try {
    const { name, code, role, department, email, phone, joinDate, status } = req.body;

    // Validation
    if (!name || !code || !role || !department || !email || !phone || !joinDate) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // ✅ Code format validation (EMP001)
    const codeRegex = /^EMP\d{3}$/;
    if (!codeRegex.test(code)) {
      return res.status(400).json({
        message: "Employee code must be in EMP001 format"
      });
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
