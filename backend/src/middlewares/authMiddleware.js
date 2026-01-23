import jwt from "jsonwebtoken";
import { jwtConfig } from "../config/jwt.js";
import User from "../models/userModel.js";
import Master from "../models/masterModel.js";

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, jwtConfig.secret);

      // Fetch user without password
      const user = await User.findById(decoded.id).select("-password");
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Fetch Role Permissions
      let permissions = [];
      if (user.role === "Admin") {
        permissions = ["ALL"];
      } else {
        const roleData = await Master.findOne({ type: 'ROLE', name: user.role });
        permissions = roleData ? roleData.permissions : [];
      }

      // Attach to request
      req.user = user;
      req.user.permissions = permissions;

      next();
    } catch (error) {
      console.error("Auth Middleware Error:", error);
      res.status(401).json({ message: "Not authorized, token failed" });
    }
  } else {
    res.status(401).json({ message: "Not authorized, no token" });
  }
};

// 🔹 Middleware: Check for specific permission
export const hasPermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user || !req.user.permissions) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Admin or matching permission
    if (req.user.role === "Admin" || req.user.permissions.includes("ALL") || req.user.permissions.includes(requiredPermission)) {
      return next();
    }

    return res.status(403).json({ message: "Access Denied: Insufficient Permissions" });
  };
};

// 🔹 Middleware: Restrict to specific roles
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access Denied: Role not allowed" });
    }
    next();
  };
};
