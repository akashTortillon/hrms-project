import mongoose from "mongoose";

const policyDocumentSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  category: {
    type: String,
    enum: ["COMPANY_POLICY", "HR_POLICY", "GUIDELINE"],
    default: "COMPANY_POLICY"
  },
  description: { type: String, default: "" },
  filePath: { type: String, required: true },
  fileUrl: { type: String, default: "" },
  storage: {
    type: String,
    enum: ["LOCAL", "S3"],
    default: "LOCAL"
  },
  isActive: { type: Boolean, default: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
}, { timestamps: true });

export default mongoose.model("PolicyDocument", policyDocumentSchema);
