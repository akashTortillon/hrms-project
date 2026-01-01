
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: {
      type: String,
      required: true,
      unique: true,
      match: [
        /^\+\d{12}$/,
        "Phone number must include country code and be 12 digits (e.g. +971501234567)"
      ]
    },
  password: { type: String, required: true },
},
{ timestamps: true });


export default mongoose.model("User", userSchema);
