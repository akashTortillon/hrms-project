import bcrypt from "bcryptjs";
import User from "../models/userModel.js";
import { generateToken } from "../utils/token.js";
import { generateOtp } from "../utils/generateOtp.js";
import { sendEmail } from "../utils/sendEmail.js";

export const register = async (req, res) => {
  try {
    const { name, email, phone, password, confirmPassword } = req.body;

    // Basic validation
    if (!name || !email || !phone || !password || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // Phone validation (normalized format)
    if (!/^\+971\d{9}$/.test(phone)) {
      return res.status(400).json({
        message: "Invalid UAE phone number format"
      });
    }

    // Check if user already exists
    // Check if user already exists
    const existingUser = await User.findOne({
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
      role: req.body.role || "Employee"
    });

    const token = generateToken(user._id);

    res.status(201).json({
      message: "User registered successfully",
      token
    });
  } catch (error) {
    // console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};


import Master from "../models/masterModel.js";

// ... existing code ...

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;


    // ✅ Make email case-insensitive
    const user = await User.findOne({
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    });


    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    // Fetch Permissions from Master DB
    let permissions = [];
    if (user.role === 'Admin') {
      permissions = ["ALL"];
    } else {
      const roleDef = await Master.findOne({ type: 'ROLE', name: user.role });
      permissions = roleDef ? roleDef.permissions : [];
    }

    const token = generateToken(user._id);

    res.json({
      token,
      role: user.role,
      permissions, // <--- Optimized: Send permissions directly
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    // console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};



