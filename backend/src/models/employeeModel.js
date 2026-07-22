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

const allowanceSchema = new mongoose.Schema({
  typeName: { type: String, required: true },
  amount: { type: Number, required: true, default: 0 },
  effectiveDate: { type: Date, required: true },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  // Whether this allowance should be included in payroll generation. Defaults to true
  // (matches historical behavior). Set to false via the "Include in Payroll" toggle in
  // the Appraisals screen to store the allowance for record-keeping only.
  includeInPayroll: { type: Boolean, default: true },
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
  // Whether the company/branch change has actually been applied to the employee.
  // Immediate transfers (effectiveDate <= today) are applied on creation. Future-dated
  // transfers stay pending (applied:false) until their effectiveDate arrives, at which
  // point applyDuePendingTransfers() promotes them. Existing history predates this field
  // and was always applied instantly, so the default is true.
  applied: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const employeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  // Always auto-generated (EMP001, EMP002...), immutable, kept as an internal reference
  // even after `code` is edited by a user.
  systemCode: { type: String, unique: true, sparse: true },
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
  // Personal Document Fields
  passportNo: { type: String, default: "" },
  passportExpiry: { type: Date },
  emiratesIdNo: { type: String, default: "" },
  emiratesIdExpiry: { type: Date },
  contractType: { type: String },
  designation: { type: String },
  // Salary fields
  basicSalary: { type: String },
  allowance: { type: Number, default: 0 },
  hra: { type: Number, default: 0 },
  accommodationAllowance: { type: Number, default: 0 },
  vehicleAllowance: { type: Number, default: 0 },
  totalSalary: { type: Number, default: 0 },
  visaBase: { type: Number, default: 0 },
  workBase: { type: Number, default: 0 },
  ctc: { type: Number, default: 0 },
  // Visa & Work Permit fields (used for Work Permit/Visa Report tabs)
  visaNo: { type: String, default: "" },
  visaFileNo: { type: String, default: "" },
  visaExpiry: { type: Date },
  visaCompany: { type: String, default: "" },
  workPermitCompany: { type: String, default: "" },
  // Other
  accommodation: { type: String },
  shift: { type: String, default: "Day Shift" },
  laborCardNumber: { type: String },
  laborCards: { type: [laborCardSchema], default: [] },
  personalId: { type: String },
  bankName: { type: String },
  iban: { type: String },
  bankAccount: { type: String },
  agentId: { type: String },
  // Stores the manager/finance-manager's Employee._id (matches what the Add/Edit Employee
  // dropdowns display and submit). Approval routing (requestController.js) already resolves
  // this to the linked User account via User.findOne({ employeeId: ... }), so this stays in
  // "Employee space" end-to-end instead of being silently converted to a User._id, which used
  // to break dropdown pre-selection on Edit (stored value could never match the option list).
  designatedManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    default: null
  },
  designatedFinanceManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
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
  // Ad-hoc allowances layered on top of the fixed allowance/hra/accommodation/vehicle
  // fields above — added or increased via Appraisals > Add Allowance. typeName comes
  // from the "Allowance Types" master list.
  allowances: { type: [allowanceSchema], default: [] },
  transferHistory: { type: [transferHistorySchema], default: [] },
  profilePhotoPath: { type: String, default: "" },
  profilePhotoUrl: { type: String, default: "" },
  profilePhotoStorage: {
    type: String,
    enum: ["LOCAL", "S3"],
    default: "LOCAL"
  },
  profilePhotoUploadedAt: { type: Date, default: null },
  // Biometric Badge Number (from BioCloud device - e.g. R106, P104, D101)
  badgeNumber: { type: String, default: null, sparse: true, index: true }
}, { timestamps: true });

export default mongoose.model("Employee", employeeSchema);
