
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: {
    type: String,
    required: true,
    unique: true,
    match: [
      /^\+[1-9]\d{6,14}$/,
      "Phone number must include a valid country code (e.g. +971501234567)"
    ]
  },
  password: { type: String, required: true },
  role: { type: String, default: "Employee" },
  // Forces the Change Password modal on next login/refresh - set true whenever an
  // admin resets a password or a new account is created with a shared default
  // password, cleared once the user successfully changes it themselves.
  mustChangePassword: { type: Boolean, default: false },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: false
  },
  refreshTokens: [
    {
      token: { type: String, required: true },
      family: { type: String, required: true },
      expires: { type: Date, required: true },
      createdAt: { type: Date, default: Date.now }
    }
  ],
  dismissedNotifications: {
    type: [String],
    default: []
  }
},
  { timestamps: true });


export default mongoose.model("User", userSchema);
