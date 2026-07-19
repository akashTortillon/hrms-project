import mongoose from "mongoose";

const payrollAuditSchema = new mongoose.Schema({
    action: {
        type: String,
        required: true,
        enum: ["GENERATED", "FINALIZED", "UNFINALIZED", "ANCHOR_SET", "ADJUSTMENT", "EXPORTED", "SIF_GENERATED"]
    },
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        // required: true // Make optional for now in case of automated tasks or if context missing
    },
    performedByName: { type: String },
    month: { type: String, required: true },
    year: { type: String, required: true },
    // Real period identity for GENERATED/FINALIZED entries under the rolling-window
    // model. Optional so pre-existing audit rows (calendar-month era) still validate;
    // getLatestFinalizedCycle() falls back to computing an equivalent periodEnd from
    // month/year for those older rows.
    periodStart: { type: Date },
    periodEnd: { type: Date },
    details: { type: String },
    relatedPayrollId: { type: mongoose.Schema.Types.ObjectId, ref: "Payroll" }, // ✅ Linked to specific payroll record

    // Snapshot of key metrics (Optional)
    totalEmployees: { type: Number },
    totalNetSalary: { type: Number },

    timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model("PayrollAudit", payrollAuditSchema);
