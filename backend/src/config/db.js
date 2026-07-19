// src/config/db.js

import mongoose from "mongoose";
import Master from "../models/masterModel.js";

const ensureDefaultRoles = async () => {
  const defaultRoles = [
    {
      name: "Manager",
      description: "Line manager with first-level leave approval access",
      permissions: ["VIEW_DASHBOARD", "VIEW_ALL_EMPLOYEES", "APPROVE_MANAGER_REQUESTS"]
    },
    {
      name: "Finance Manager",
      description: "Finance approver for loan and salary advance requests before HR review",
      permissions: ["VIEW_DASHBOARD", "VIEW_ALL_EMPLOYEES", "APPROVE_FINANCE_REQUESTS"]
    }
  ];

  for (const role of defaultRoles) {
    const existingRole = await Master.findOne({ type: "ROLE", name: role.name });
    if (!existingRole) {
      await Master.create({
        type: "ROLE",
        name: role.name,
        description: role.description,
        permissions: role.permissions,
        isActive: true
      });
      continue;
    }

    const mergedPermissions = Array.from(new Set([...(existingRole.permissions || []), ...role.permissions]));
    const needsUpdate =
      !existingRole.isActive
      || mergedPermissions.length !== (existingRole.permissions || []).length
      || !existingRole.description;

    if (needsUpdate) {
      existingRole.permissions = mergedPermissions;
      existingRole.description = existingRole.description || role.description;
      existingRole.isActive = true;
      await existingRole.save();
    }
  }
};

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.DB_URL);
    await ensureDefaultRoles();
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Database Name: ${conn.connection.name}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
