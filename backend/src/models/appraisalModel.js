import mongoose from "mongoose";

const appraisalSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true
  },
  cycle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AppraisalCycle",
    required: true
  },
  recommendedIncrement: { type: Number, default: 0 },
  approvedIncrement: { type: Number, default: 0 },
  currentSalary: { type: Number, default: 0 },
  recommendedSalary: { type: Number, default: 0 },
  effectiveDate: { type: Date, required: true },
  comments: { type: String, default: "" },
  status: {
    type: String,
    enum: ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"],
    default: "DRAFT"
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  approvedAt: { type: Date, default: null }
}, { timestamps: true });

appraisalSchema.index({ employee: 1, cycle: 1 }, { unique: true });

export default mongoose.model("Appraisal", appraisalSchema);
