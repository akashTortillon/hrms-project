import mongoose from "mongoose";

const reportActivitySchema = new mongoose.Schema({
    type: { type: String, enum: ["Generation", "Export"], required: true },
    reportName: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

const ReportActivity = mongoose.model("ReportActivity", reportActivitySchema);

export default ReportActivity;
