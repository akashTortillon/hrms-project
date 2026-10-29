// One-time setup utility - creates the standard Payroll Rule masters (HRA,
// Transport/Phone allowance, Overtime, Unpaid-leave/LOP deduction, Loan
// repayment) if they don't already exist (upsert by type+name, safe to re-run).
//
// Previously seeded these under type: "PAYROLL_COMPONENT" - but generatePayroll
// and the Masters UI only ever read/write type: "PAYROLL_RULE", so running this
// silently did nothing observable. Fixed to the correct type.
//
// Run manually only (never wired into any request path): `node
// src/scripts/seedPayrollMasters.js`. Do NOT run against production without
// explicit sign-off - it activates a real, automatic absence-deduction rule
// (isAutomatic: true) that immediately changes payroll calculations app-wide
// the next time payroll is generated.
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Master from '../models/masterModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        // console.log("MongoDB Connected");
    } catch (error) {
        // console.error("DB Connection Error:", error);
        process.exit(1);
    }
};

const payrollRules = [
    // ALLOWANCES
    {
        type: "PAYROLL_RULE",
        name: "House Rent Allowance (HRA)",
        code: "HRA",
        metadata: {
            category: "ALLOWANCE",
            calculationType: "PERCENTAGE",
            value: 20, // 20%
            base: "BASIC_SALARY",
            isAutomatic: true
        }
    },
    {
        type: "PAYROLL_RULE",
        name: "Transport Allowance",
        code: "TA",
        metadata: {
            category: "ALLOWANCE",
            calculationType: "FIXED",
            value: 1000,
            isAutomatic: true
        }
    },
    {
        type: "PAYROLL_RULE",
        name: "Phone Allowance",
        code: "PHONE",
        metadata: {
            category: "ALLOWANCE",
            calculationType: "FIXED",
            value: 200,
            isAutomatic: true
        }
    },

    // OVERTIME
    {
        type: "PAYROLL_RULE",
        name: "Overtime (Regular)",
        code: "OT_REG",
        metadata: {
            category: "ALLOWANCE", // Technically an addition
            calculationType: "HOURLY_MULTIPLIER",
            value: 1.25, // 1.25x
            base: "HOURLY_RATE",
            isAutomatic: false // Calculated from attendance, not fixed
        }
    },

    // DEDUCTIONS
    {
        type: "PAYROLL_RULE",
        name: "Unpaid Leave Deduction",
        code: "LOP",
        metadata: {
            category: "DEDUCTION",
            calculationType: "DAILY_RATE",
            basis: "ABSENT_DAYS", // explicit - don't rely solely on the code==="LOP" legacy fallback
            value: 1, // 1 Day Salary per absent day
            base: "GROSS_SALARY",
            isAutomatic: true // Auto applied if Absent
        }
    },
    {
        type: "PAYROLL_RULE",
        name: "Loan Repayment",
        code: "LOAN",
        metadata: {
            category: "DEDUCTION",
            calculationType: "FIXED",
            value: 0,
            isAutomatic: true // Linked to Active Loans
        }
    }
];

const leaveTypes = [
    {
        type: "LEAVE_TYPE",
        name: "Annual Leave",
        metadata: {
            maxDaysPerYear: 30,
            accrualRate: 2.5, // Days per month
            isPaid: true,
            carryForwardLimit: 15
        }
    },
    {
        type: "LEAVE_TYPE",
        name: "Sick Leave",
        metadata: {
            maxDaysPerYear: 15,
            accrualRate: 1.25,
            isPaid: true,
            payPercentage: 100 // First 15 days full pay
        }
    },
    {
        type: "LEAVE_TYPE",
        name: "Maternity Leave",
        metadata: {
            maxDaysPerYear: 60,
            accrualRate: 0,
            isPaid: true
        }
    },
    {
        type: "LEAVE_TYPE",
        name: "Unpaid Leave",
        metadata: {
            isPaid: false
        }
    }
];

const seed = async () => {
    await connectDB();

    // console.log("Seeding Payroll & Leave Masters...");

    // Helper to Upsert
    const upsert = async (item) => {
        const exists = await Master.findOne({ type: item.type, name: item.name });
        if (!exists) {
            await Master.create(item);
            // console.log(` Created: ${item.name} (${item.type})`);
        } else {
            // console.log(` Skipped: ${item.name} (Already exists)`);
        }
    };

    for (const item of payrollRules) await upsert(item);
    for (const item of leaveTypes) await upsert(item);

    // console.log("Seeding Completed.");
    process.exit();
};

seed();
