
import mongoose from "mongoose";

const payrollSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        required: true
    },
    month: { type: Number, required: true }, // 1-12
    year: { type: Number, required: true },  // 2026

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
        meta: mongoose.Schema.Types.Mixed // For debugging (e.g. "20% of Basic")
    }],

    deductions: [{
        name: String,
        amount: Number,
        type: { type: String, enum: ["AUTO", "MANUAL"], default: "AUTO" },
        meta: mongoose.Schema.Types.Mixed // e.g. "Absent 2 days * Daily Rate"
    }],

    // Totals
    totalAllowances: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    netSalary: { type: Number, required: true },

    // Attendance Summary for Calculations
    attendanceSummary: {
        totalDays: Number,
        daysPresent: Number,
        daysAbsent: Number,
        unpaidLeaves: Number,
        overtimeHours: Number
    },

    // WPS Info
    paymentDate: Date,
    transactionId: String

}, { timestamps: true });

// Prevent duplicate payroll for same month/employee
payrollSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });

export default mongoose.model("Payroll", payrollSchema);
