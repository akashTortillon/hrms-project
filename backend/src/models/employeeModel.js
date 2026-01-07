import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  role: { type: String, required: true },
  department: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  joinDate: { type: Date, required: true },
  status: { 
    type: String, 
    required: true,
    enum: ["Active", "Inactive", "On Leave"],
    default: "Active"
  }
}, { timestamps: true });

export default mongoose.model("Employee", employeeSchema);