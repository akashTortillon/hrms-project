
import Payroll from "../models/payrollModel.js";
import Employee from "../models/employeeModel.js";
import Master from "../models/masterModel.js";
import Attendance from "../models/attendanceModel.js";
import mongoose from "mongoose";

// --- HELPER: Calculate Attendance Stats ---
const getAttendanceStats = async (employeeId, month, year) => {
    // Basic Mock Logic for now (Replace with real Aggregation later)
    // TODO: Use actual Attendance Model aggregation

    // Construct string dates for query since Attendance uses "YYYY-MM-DD" string
    const strMonth = String(month).padStart(2, '0');
    const startStr = `${year}-${strMonth}-01`;
    const endStr = `${year}-${strMonth}-31`; // Simple upper bound, works for string comparison

    console.log(`[Payroll] Querying Attendance for Emp: ${employeeId} | Range: ${startStr} to ${endStr}`);

    const logs = await Attendance.find({
        employee: employeeId,
        date: { $gte: startStr, $lte: endStr }
    });

    console.log(`[Payroll] Found ${logs.length} logs for ${employeeId}`);

    const daysPresent = logs.filter(l => l.status === 'Present' || l.status === 'Late').length;
    const daysAbsent = logs.filter(l => l.status === 'Absent').length;
    const late = logs.filter(l => l.status === 'Late').length;

    // Calculate Overtime (Mock: Random if active)
    const overtimeHours = 0;

    return {
        totalDays: 30, // Standard Month
        daysPresent,
        daysAbsent,
        unpaidLeaves: 0, // Need Leave Request integration
        overtimeHours,
        late
    };
};

// --- API: Generate Payroll for a Month ---
export const generatePayroll = async (req, res) => {
    try {
        const { month, year } = req.body;

        // 1. Fetch Active Employees
        const employees = await Employee.find({ status: "Active" });

        // 2. Fetch Payroll Rules (Masters)
        const rules = await Master.find({ type: "PAYROLL_RULE", isActive: true });

        const payrollRecords = [];

        for (const emp of employees) {
            // Fix: parse string "15,000" -> 15000. Handle root level field.
            const basicSalaryRaw = emp.basicSalary || "0";
            const basicSalary = Number(String(basicSalaryRaw).replace(/[^0-9.-]+/g, ""));
            const allowanceList = [];
            const deductionList = [];
            let totalAllowances = 0;
            let totalDeductions = 0;

            // Get Attendance Stats
            const stats = await getAttendanceStats(emp._id, month, year);

            // 3. Apply Rules
            for (const rule of rules) {
                const meta = rule.metadata || {};

                // Only process Automatic rules
                if (!meta.isAutomatic) continue;

                let amount = 0;

                // --- ALLOWANCE LOGIC ---
                if (meta.category === "ALLOWANCE") {
                    if (meta.calculationType === "FIXED") {
                        amount = Number(meta.value || 0);
                    } else if (meta.calculationType === "PERCENTAGE") {
                        const baseAmount = meta.base === "BASIC_SALARY" ? basicSalary : basicSalary; // Can add GROSS later
                        amount = baseAmount * (Number(meta.value) / 100);
                    }

                    if (amount > 0) {
                        allowanceList.push({ name: rule.name, amount, type: "AUTO", meta: `Rule: ${rule.name}` });
                        totalAllowances += amount;
                    }
                }

                // --- DEDUCTION LOGIC ---
                else if (meta.category === "DEDUCTION") {

                    // 1. Unpaid Leave / LOP
                    if (rule.code === "LOP" || rule.name.includes("Unpaid")) {
                        const dailyRate = basicSalary / 30;
                        const absentDays = stats.daysAbsent + stats.unpaidLeaves;
                        amount = absentDays * dailyRate;

                        if (amount > 0) {
                            deductionList.push({
                                name: "Unpaid Leave / Absent",
                                amount: parseFloat(amount.toFixed(2)),
                                type: "AUTO",
                                meta: `${absentDays} days * ${dailyRate.toFixed(2)}`
                            });
                            totalDeductions += amount;
                        }
                    }

                    // 2. Late Deduction
                    else if ((rule.code && rule.code.includes("LATE")) || (rule.name && rule.name.includes("Late")) || meta.condition === "LATE_INSTANCE") {
                        const lateCount = stats.late || 0;

                        if (lateCount > 0) {
                            if (meta.calculationType === "DAILY_RATE") {
                                // Value 0.5 = Half Day
                                const dailyRate = basicSalary / 30;
                                const deductionPerLate = dailyRate * Number(meta.value);
                                amount = deductionPerLate * lateCount;
                            }
                            else if (meta.calculationType === "FIXED") {
                                amount = Number(meta.value) * lateCount;
                            }
                            else {
                                // Fallback: Fixed 100
                                amount = 100 * lateCount;
                            }

                            if (amount > 0) {
                                deductionList.push({
                                    name: "Late Deduction",
                                    amount: parseFloat(amount.toFixed(2)),
                                    type: "AUTO",
                                    meta: `${lateCount} lates * ${meta.value} (${meta.calculationType})`
                                });
                                totalDeductions += amount;
                            }
                        }
                    }
                }
            }

            // 4. Calculate Net
            const netSalary = basicSalary + totalAllowances - totalDeductions;

            // 5. Prepare Record (Upsert)
            payrollRecords.push({
                updateOne: {
                    filter: { employee: emp._id, month, year },
                    update: {
                        $set: {
                            status: "DRAFT",
                            basicSalary,
                            allowances: allowanceList,
                            deductions: deductionList,
                            totalAllowances,
                            totalDeductions,
                            netSalary,
                            attendanceSummary: stats
                        }
                    },
                    upsert: true
                }
            });
        }

        // Execute Batch
        if (payrollRecords.length > 0) {
            await Payroll.bulkWrite(payrollRecords);
        }

        res.status(200).json({
            message: `Payroll Generated for ${employees.length} employees`,
            month,
            year
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// --- API: Get Payroll Summary ---
export const getPayrollSummary = async (req, res) => {
    try {
        const { month, year } = req.query;
        const records = await Payroll.find({ month, year }).populate("employee", "name code department designation role");

        let totalNet = 0;
        let totalBasic = 0;
        let totalAllowances = 0;
        let totalDeductions = 0;

        records.forEach(r => {
            totalNet += r.netSalary || 0;
            totalBasic += r.basicSalary || 0;
            totalAllowances += r.totalAllowances || 0;
            totalDeductions += r.totalDeductions || 0;
        });

        res.status(200).json({
            records,
            stats: {
                count: records.length,
                totalBasic,
                totalAllowances,
                totalDeductions,
                totalNet
            }
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
