import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  role: { type: String, required: true },
  department: { type: String, required: true },
  branch: { type: String },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  joinDate: { type: Date, required: true },
  status: {
    type: String,
    required: true,
    enum: ["Active", "Inactive", "On Leave", "Onboarding"],
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
  agentId: { type: String },
  /** 0=Sun .. 6=Sat — source of truth for weekly off when non-empty; empty/absent uses workingDayType preset */
  weeklyOffDays: [{ type: Number, min: 0, max: 6 }],
  /** Preset: 0 none, 2 two days (default Fri+Sat in helper), 4 Sundays, 8 Sat+Sun */
  workingDayType: { type: Number, enum: [0, 2, 4, 8], default: 4 }
}, { timestamps: true });

export default mongoose.model("Employee", employeeSchema);