import bcrypt from "bcryptjs";
import User from "../models/userModel.js";
import { generateAccessToken, generateRefreshToken } from "../utils/token.js";
import { generateOtp } from "../utils/generateOtp.js";
import { sendEmail } from "../utils/sendEmail.js";
import { jwtConfig } from "../config/jwt.js";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from 'uuid'; // You might need to install uuid or use a custom random string generator
import Master from "../models/masterModel.js";
import Employee from "../models/employeeModel.js";

// Helper to set refresh token cookie
const setRefreshTokenCookie = (res, token) => {
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Set to true in production
    sameSite: "lax", // 'lax' is better for development/redirects than 'strict'
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  });
};

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

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    const family = uuidv4();

    // Save refresh token
    user.refreshTokens.push({
      token: refreshToken,
      family: family,
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });
    await user.save();

    setRefreshTokenCookie(res, refreshToken);

    res.status(201).json({
      message: "User registered successfully",
      token: accessToken
    });
  } catch (error) {
    // console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

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

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    const family = uuidv4();

    // Remove expired tokens
    if (!user.refreshTokens) user.refreshTokens = [];
    user.refreshTokens = user.refreshTokens.filter(t => t.expires > Date.now());

    // Save new refresh token
    user.refreshTokens.push({
      token: refreshToken,
      family: family,
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });
    await user.save();

    setRefreshTokenCookie(res, refreshToken);

    // Check for linked employee via email if not explicitly linked
    let finalEmployeeId = user.employeeId;
    if (!finalEmployeeId) {
      const linkedEmp = await Employee.findOne({
        email: { $regex: new RegExp(`^${user.email}$`, 'i') }
      });
      if (linkedEmp) finalEmployeeId = linkedEmp._id;
    }

    res.json({
      token: accessToken,
      role: user.role,
      permissions,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        employeeId: finalEmployeeId // Include resolved Employee ID
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error: " + error.message });
  }
};

export const refresh = async (req, res) => {
  const { refreshToken } = req.cookies;

  // console.log("🔄 Refresh Request Received. Token present?", !!refreshToken);

  if (!refreshToken) {
    console.warn("⚠️ No refresh token in cookies");
    return res.status(401).json({ message: "No refresh token provided" });
  }

  try {
    const decoded = jwt.verify(refreshToken, jwtConfig.refreshSecret);
    const user = await User.findById(decoded.id);

    if (!user) {
      console.warn("⚠️ User not found for refresh token");
      return res.status(401).json({ message: "User not found" });
    }

    // Find the token in the DB
    const tokenDoc = user.refreshTokens?.find(t => t.token === refreshToken);

    if (!tokenDoc) {
      console.error("🚨 Token reuse detected! Clearing valid tokens for security.");
      user.refreshTokens = [];
      await user.save();
      res.clearCookie("refreshToken");
      return res.status(403).json({ message: "Token reuse detected. access denied." });
    }

    // Token Rotation
    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    // Replace the old token with the new one (same family)
    tokenDoc.token = newRefreshToken;
    tokenDoc.expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Remove expired tokens while we are here
    user.refreshTokens = user.refreshTokens.filter(t => t.expires > Date.now());

    await user.save();

    setRefreshTokenCookie(res, newRefreshToken);
    // console.log("✅ Token Refreshed Successfully");

    res.json({ token: newAccessToken });

  } catch (error) {
    console.error("❌ Refresh error:", error.message);
    res.clearCookie("refreshToken");
    res.status(401).json({ message: "Invalid refresh token" });
  }
};

export const logout = async (req, res) => {
  const { refreshToken } = req.cookies;

  if (refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, jwtConfig.refreshSecret);
      const user = await User.findById(decoded.id);
      if (user && user.refreshTokens) {
        user.refreshTokens = user.refreshTokens.filter(t => t.token !== refreshToken);
        await user.save();
      }
    } catch (e) {
      // Ignore invalid tokens on logout
    }
  }

  res.clearCookie("refreshToken");
  res.json({ message: "Logged out successfully" });
};



