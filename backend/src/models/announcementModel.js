import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  category: {
    type: String,
    enum: ["BIRTHDAY", "LEAVE_REMINDER", "HR_NOTIFICATION", "GENERAL"],
    default: "GENERAL"
  },
  audience: {
    type: String,
    enum: ["ALL", "BRANCH", "COMPANY", "EMPLOYEE"],
    default: "ALL"
  },
  branch: { type: String, default: "" },
  company: { type: String, default: "" },
  employeeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Employee" }],
  publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  publishedAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model("Announcement", announcementSchema);
