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
  },
  dob: { type: Date },
  nationality: { type: String },
  address: { type: String },
  passportExpiry: { type: Date },
  emiratesIdExpiry: { type: Date },
  contractType: { type: String },
  designation: { type: String },
  basicSalary: { type: String },
  accommodation: { type: String },
  shift: { type: String, default: "Day Shift" },
  visaExpiry: { type: Date },
  laborCardNumber: { type: String },
  personalId: { type: String },
  bankName: { type: String },
  iban: { type: String },
  bankAccount: { type: String },
  agentId: { type: String }
}, { timestamps: true });

export default mongoose.model("Employee", employeeSchema);