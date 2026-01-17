import Payroll from "../models/payrollModel.js";
import Employee from "../models/employeeModel.js";
import Master from "../models/masterModel.js";
import Attendance from "../models/attendanceModel.js";
import mongoose from "mongoose";
import SystemSettings from "../models/systemSettingsModel.js";

// --- HELPER: Calculate Attendance Stats ---
const getAttendanceStats = async (employeeId, month, year) => {
    // 1. Setup Date Range
    const daysInMonth = new Date(year, month, 0).getDate();
    const strMonth = String(month).padStart(2, '0');
    const startStr = `${year}-${strMonth}-01`;
    const endStr = `${year}-${strMonth}-${daysInMonth}`;

    // 2. Fetch Data Sources
    // A. Attendance Logs
    const logs = await Attendance.find({
        employee: employeeId,
        date: { $gte: startStr, $lte: endStr }
    });
    const logMap = {}; // date string -> log
    logs.forEach(l => logMap[l.date] = l);

    // B. Public Holidays (From System Settings)
    const settings = await SystemSettings.findOne();
    const holidaySet = new Set();
    if (settings && settings.holidays) {
        settings.holidays.forEach(h => {
            if (h.date) {
                const d = new Date(h.date);
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                holidaySet.add(`${yyyy}-${mm}-${dd}`);
            }
        });
    }

    // C. Approved Leaves (TODO: Integrate real Request model. For now check Attendance 'On Leave' status)

    // 3. Iterate Day by Day
    let paidDays = 0; // Present + Weekends + Holidays + Paid Leaves
    let lopDays = 0;  // Unaccounted Absences + Unpaid Leaves
    let lateCount = 0;

    // Debug: Trace logic
    // console.log(`[Payroll Scan] ${employeeId} : ${startStr} to ${endStr}`);

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${strMonth}-${String(day).padStart(2, '0')}`;
        const dateObj = new Date(year, month - 1, day);
        const dayOfWeek = dateObj.getDay(); // 0=Sun, 6=Sat

        // -- PRIORITY 1: ATTENDANCE RECORD --
        if (logMap[dateStr]) {
            const status = logMap[dateStr].status;
            if (status === 'Present' || status === 'Late') {
                paidDays++;
                if (status === 'Late') lateCount++;
            } else if (status === 'On Leave') {
                // Assume Paid Leave for now unless marked otherwise
                paidDays++;
            } else if (status === 'Absent') {
                lopDays++;
            }
        }
        // -- PRIORITY 2: WEEKEND (Sunday) --
        else if (dayOfWeek === 0) {
            paidDays++; // Weekends are Paid
        }
        // -- PRIORITY 3: PUBLIC HOLIDAY --
        else if (holidaySet.has(dateStr)) {
            paidDays++; // Holidays are Paid
        }
        // -- PRIORITY 4: NO RECORD -> IMPLIED ABSENT --
        else {
            // It's a working day, no punch, no holiday -> ABSENT
            lopDays++;
        }
    }

    console.log(`[Payroll Calc] Emp: ${employeeId} | Paid: ${paidDays} | LOP: ${lopDays} | Late: ${lateCount}`);

    return {
        totalDays: daysInMonth,
        daysPresent: paidDays, // For Salary Calc, this is "Days Eligible for Pay"
        daysAbsent: lopDays,   // Distinctly "Loss of Pay" days
        unpaidLeaves: 0,       // Merged into daysAbsent above for simplicity? Or separate if needed.
        overtimeHours: 0,
        late: lateCount
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
