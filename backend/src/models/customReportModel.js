import mongoose from "mongoose";

const customReportSchema = new mongoose.Schema({
    title: { type: String, required: true },
    dataset: { type: String, required: true },
    columns: [{ type: String }],
    filters: { type: Object, default: {} },
    lastRun: { type: Date, default: Date.now }
}, { timestamps: true });

const CustomReport = mongoose.model("CustomReport", customReportSchema);

export default CustomReport;
