
import mongoose from "mongoose";

const payrollSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        required: true
    },
    // month/year are DERIVED from periodEnd (its calendar month/year) — kept for
    // backward-compat with every existing report/export endpoint that buckets by
    // month/year (SIF, MOL, payment history, payslips). The real period identity
    // is periodStart/periodEnd; month/year are just a display/query bucket.
    month: { type: Number, required: true }, // 1-12
    year: { type: Number, required: true },  // 2026

    // The actual pay period — force-contiguous rolling window (HR picks the `to`
    // date each cycle; `from` is always locked to the day after the previous
    // period's `to`). Whole calendar months are just the special case where
    // periodStart is the 1st and periodEnd is the last day of that month.
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },

    // Status Flow
    status: {
        type: String,
        enum: ["DRAFT", "PROCESSED", "PAID"],
        default: "DRAFT"
    },

    // Salary Snapshot (Locked at time of generation)
    basicSalary: { type: Number, required: true },

    // Components
    allowances: [{
        name: String,
        amount: Number,
        type: { type: String, enum: ["AUTO", "MANUAL"], default: "AUTO" },
        meta: mongoose.Schema.Types.Mixed, // For debugging (e.g. "20% of Basic")
        // ✅ Manual Tracking
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        addedAt: Date,
        reason: String
    }],

    deductions: [{
        name: String,
        amount: Number,
        type: { type: String, enum: ["AUTO", "MANUAL"], default: "AUTO" },
        meta: mongoose.Schema.Types.Mixed, // e.g. "Absent 2 days * Daily Rate"
        // ✅ Manual Tracking
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        addedAt: Date,
        reason: String
    }],

    // Totals
    totalAllowances: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    netSalary: { type: Number, required: true },

    // Attendance Summary for Calculations
    attendanceSummary: {
        totalDays: Number,
        daysPresent: Number,
        paidLeaves: Number, // ✅ NEW
        daysAbsent: Number,
        unpaidLeaves: Number,
        overtimeHours: Number,
        late: Number
    },

    // WPS Info
    paymentDate: Date,
    transactionId: String

}, { timestamps: true });

// Prevent duplicate payroll for the same employee + exact period. month/year are
// derived (from periodEnd) and aren't guaranteed unique on their own once periods
// are rolling windows instead of calendar months, so the real identity is the
// period dates themselves.
payrollSchema.index({ employee: 1, periodStart: 1, periodEnd: 1 }, { unique: true });

export default mongoose.model("Payroll", payrollSchema);
