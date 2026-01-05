
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: {
      type: String,
      required: true,
      unique: true,
      match: [
        /^\+971\d{9}$/,
        "Phone number must be a valid UAE number (e.g. +971501234567)"
      ]
    },
  password: { type: String, required: true },
//   otp: String,
//     otpExpiresAt: Date,
//     isVerified: { type: Boolean, default: false },
},
{ timestamps: true });


export default mongoose.model("User", userSchema);
