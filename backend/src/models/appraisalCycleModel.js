import mongoose from "mongoose";

const appraisalCycleSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: {
    type: String,
    enum: ["DRAFT", "ACTIVE", "CLOSED"],
    default: "DRAFT"
  },
  notes: { type: String, default: "" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
}, { timestamps: true });

export default mongoose.model("AppraisalCycle", appraisalCycleSchema);
