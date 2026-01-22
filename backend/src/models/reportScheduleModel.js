import mongoose from "mongoose";

const reportScheduleSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    frequency: { type: String, enum: ["Daily", "Weekly", "Monthly"], default: "Daily" },
    recipient: { type: String, default: "HR Team" },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    lastRun: { type: Date }
}, { timestamps: true });

const ReportSchedule = mongoose.model("ReportSchedule", reportScheduleSchema);

export default ReportSchedule;
