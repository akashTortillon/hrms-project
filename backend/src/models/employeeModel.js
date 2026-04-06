import mongoose from "mongoose";

const salaryHistorySchema = new mongoose.Schema({
  salaryType: {
    type: String,
    enum: ["JOINING", "APPRAISAL", "PROBATION_INCREMENT", "MANUAL_ADJUSTMENT"],
    default: "JOINING"
  },
  basicSalary: { type: Number, default: 0 },
  visaBase: { type: Number, default: 0 },
  workBase: { type: Number, default: 0 },
  ctc: { type: Number, default: 0 },
  incrementAmount: { type: Number, default: 0 },
  effectiveDate: { type: Date, required: true },
  notes: { type: String, default: "" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const laborCardSchema = new mongoose.Schema({
  number: { type: String, required: true },
  issueDate: { type: Date, default: null },
  expiryDate: { type: Date, default: null },
  notes: { type: String, default: "" },
  isPrimary: { type: Boolean, default: false }
}, { _id: true });

const transferHistorySchema = new mongoose.Schema({
  previousCompany: { type: String, default: "" },
  newCompany: { type: String, default: "" },
  previousBranch: { type: String, default: "" },
  newBranch: { type: String, default: "" },
  effectiveDate: { type: Date, required: true },
  reason: { type: String, default: "" },
  transferredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const employeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  role: { type: String, required: true },
  department: { type: String, required: true },
  branch: { type: String },
  company: { type: String, default: "" },
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
  visaBase: { type: Number, default: 0 },
  workBase: { type: Number, default: 0 },
  ctc: { type: Number, default: 0 },
  accommodation: { type: String },
  shift: { type: String, default: "Day Shift" },
  visaExpiry: { type: Date },
  laborCardNumber: { type: String },
  laborCards: { type: [laborCardSchema], default: [] },
  personalId: { type: String },
  bankName: { type: String },
  iban: { type: String },
  bankAccount: { type: String },
  agentId: { type: String },
  designatedManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  probationStartDate: { type: Date, default: null },
  probationEndDate: { type: Date, default: null },
  probationStatus: {
    type: String,
    enum: ["NOT_APPLICABLE", "ACTIVE", "PENDING_CONFIRMATION", "CONFIRMED"],
    default: "NOT_APPLICABLE"
  },
  probationReminderSentAt: { type: Date, default: null },
  probationConfirmedAt: { type: Date, default: null },
  probationConfirmedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  fixedProbationIncrementAmount: { type: Number, default: 0 },
  salaryHistory: { type: [salaryHistorySchema], default: [] },
  transferHistory: { type: [transferHistorySchema], default: [] }
}, { timestamps: true });

export default mongoose.model("Employee", employeeSchema);
