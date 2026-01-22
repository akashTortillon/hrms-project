import Payroll from "../models/payrollModel.js";
import Employee from "../models/employeeModel.js";
import Master from "../models/masterModel.js";
import Attendance from "../models/attendanceModel.js";
import mongoose from "mongoose";
import SystemSettings from "../models/systemSettingsModel.js";
import * as XLSX from "xlsx";

// --- HELPER: Calculate Attendance Stats ---
// --- HELPER: Parse "8h 45m" to decimal hours ---
const parseHours = (timeStr) => {
    if (!timeStr) return 0;
    const parts = timeStr.split(' ');
    let h = 0, m = 0;
    for (const p of parts) {
        if (p.includes('h')) h = parseInt(p);
        if (p.includes('m')) m = parseInt(p);
    }
    return h + (m / 60);
};

// --- HELPER: Calculate Attendance Stats ---
const getAttendanceStats = async (employeeId, month, year, preFetchedSettings = null, shiftMap = {}, debugInfo = null) => {
    // 1. Setup Date Range
    const daysInMonth = new Date(year, month, 0).getDate();
    const strMonth = String(month).padStart(2, '0');
    const startStr = `${year}-${strMonth}-01`;
    const endStr = `${year}-${strMonth}-${daysInMonth}`;

    // 2. Fetch Data Sources
    const logs = await Attendance.find({
        employee: employeeId,
        date: { $gte: startStr, $lte: endStr }
    });
    const logMap = {};
    logs.forEach(l => logMap[l.date] = l);

    const settings = preFetchedSettings || await SystemSettings.findOne();
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

    // 3. Iterate Day by Day
    let paidDays = 0;
    let lopDays = 0;
    let lateCount = 0;
    let overtimeHours = 0;
    let unpaidLeavesCount = 0; // ✅ Track unpaid leaves separately
    const GLOBAL_STANDARD_HOURS = 9;

    // Helper to get hours for a specific shift name
    const getShiftHours = (shiftName) => {
        if (!shiftName || !shiftMap[shiftName]) return GLOBAL_STANDARD_HOURS;
        return Number(shiftMap[shiftName].workHours) || GLOBAL_STANDARD_HOURS;
    };

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${strMonth}-${String(day).padStart(2, '0')}`;
        const dateObj = new Date(year, month - 1, day);
        const dayOfWeek = dateObj.getDay();

        // -- PRIORITY 1: ATTENDANCE RECORD --
        if (logMap[dateStr]) {
            const record = logMap[dateStr];
            const status = record.status;

            if (status === 'Present' || status === 'Late') {
                paidDays++;
                if (status === 'Late') lateCount++;

                // Calculate Overtime based on THIS DAY'S Shift
                if (record.workHours) {
                    const worked = parseHours(record.workHours);
                    const shiftName = record.shift || "Day Shift"; // Fallback to Day Shift
                    const standardLimit = getShiftHours(shiftName);

                    if (worked > standardLimit) {
                        const dailyOT = worked - standardLimit;
                        overtimeHours += dailyOT;
                        if (debugInfo?.code === 'EMP001') {
                            console.log(`[DEBUG EMP001] ${dateStr} | Shift: ${shiftName} (${standardLimit}h) | Worked: ${worked.toFixed(2)}h | OT: ${dailyOT.toFixed(2)}h`);
                        }
                    } else if (debugInfo?.code === 'EMP001') {
                        console.log(`[DEBUG EMP001] ${dateStr} | Shift: ${shiftName} (${standardLimit}h) | Worked: ${worked.toFixed(2)}h | No OT`);
                    }
                }
            } else if (status === 'On Leave') {
                // ✅ NEW: Distinguish Paid vs Unpaid Leaves
                if (record.isPaid !== false) {
                    paidDays++;
                } else {
                    lopDays++;
                    unpaidLeavesCount++; // ✅ NEW
                }
            } else if (status === 'Absent') {
                lopDays++;
            }
        }
        // -- PRIORITY 2: WEEKEND (Sunday) --
        else if (dayOfWeek === 0) {
            paidDays++;
        }
        // -- PRIORITY 3: PUBLIC HOLIDAY --
        else if (holidaySet.has(dateStr)) {
            paidDays++;
        }
        // -- PRIORITY 4: IMPLIED ABSENT --
        else {
            lopDays++;
        }
    }

    // console.log(`[Payroll Calc] Emp: ${employeeId} | Paid: ${paidDays} | LOP: ${lopDays} | Late: ${lateCount} | OT: ${overtimeHours.toFixed(2)}`);

    return {
        totalDays: daysInMonth,
        daysPresent: paidDays,
        daysAbsent: lopDays,
        unpaidLeaves: unpaidLeavesCount,
        overtimeHours: parseFloat(overtimeHours.toFixed(2)),
        late: lateCount
    };
};

// --- API: Generate Payroll for a Month ---
export const generatePayroll = async (req, res) => {
    try {
        const { month, year } = req.body;

        // 1. Fetch Active Employees & Rules
        const employees = await Employee.find({ status: "Active" });
        const rules = await Master.find({ type: "PAYROLL_RULE", isActive: true });

        // Fetch Shifts to map names to hours
        const shifts = await Master.find({ type: "SHIFT", isActive: true });
        const shiftMap = {}; // "Day Shift" -> { workHours: 9, ... }
        shifts.forEach(s => {
            if (s.metadata) shiftMap[s.name] = s.metadata;
        });

        const settings = await SystemSettings.findOne();

        const payrollRecords = [];

        for (const emp of employees) {
            const basicSalaryRaw = emp.basicSalary || "0";
            const basicSalary = Number(String(basicSalaryRaw).replace(/[^0-9.-]+/g, ""));

            const allowanceList = [];
            const deductionList = [];
            let totalAllowances = 0;
            let totalDeductions = 0;

            // Derived Rates
            const dailySalary = basicSalary / 30; // Standard 30 days

            // Determine Employee's Standard Hourly Rate based on THEIR assigned shift
            const empShiftName = emp.shift || "Day Shift";
            const empStandardHours = (shiftMap[empShiftName] && Number(shiftMap[empShiftName].workHours)) || 9;
            const hourlySalary = dailySalary / empStandardHours;

            // Get Stats
            const stats = await getAttendanceStats(emp._id, month, year, settings, shiftMap, { code: emp.code });

            if (emp.code === 'EMP001') {
                console.log(`[DEBUG EMP001] Stats: OT=${stats.overtimeHours}, Late=${stats.late} | Salary: Basic=${basicSalary}, Hourly=${hourlySalary.toFixed(2)}`);
            }

            // 3. Dynamic Rule Engine
            for (const rule of rules) {
                const meta = rule.metadata || {};
                if (!meta.isAutomatic) continue;

                let amount = 0;
                let description = "";

                // --- DETERMINE BASIS STATISTIC ---
                // Fallback for Legacy Rules: Map Code/Name to Basis
                let basis = meta.basis; // EXPECTED IN NEW RULES: 'LATE_COUNT', 'OVERTIME_HOURS', 'ABSENT_DAYS'

                if (!basis) {
                    if (rule.code === "LOP" || rule.name.includes("Unpaid")) basis = "ABSENT_DAYS";
                    else if ((rule.code && rule.code.includes("LATE")) || (rule.name && rule.name.includes("Late"))) basis = "LATE_COUNT";
                    else if ((rule.code && rule.code.includes("OT")) || (rule.name && rule.name.includes("Overtime"))) basis = "OVERTIME_HOURS";
                }

                // --- CALCULATE AMOUNT ---

                // Case A: Fixed or Percentage (No Statistic Needed)
                if (meta.calculationType === "FIXED") {
                    amount = Number(meta.value || 0);
                    description = `Fixed`;
                    if (emp.code === 'EMP001') console.log(`[DEBUG EMP001] Rule: ${rule.name} | FIXED | Amt: ${amount}`);
                } else if (meta.calculationType === "PERCENTAGE") {
                    amount = basicSalary * (Number(meta.value) / 100);
                    description = `${meta.value}% of Basic`;
                }

                // Case B: Statistic Based (Hourly/Daily/Instance)
                else if (basis) {
                    let statValue = 0;
                    let unitRate = 0;

                    // 1. Get the Statistic Value
                    if (basis === "LATE_COUNT") statValue = stats.late;
                    else if (basis === "ABSENT_DAYS") statValue = stats.daysAbsent + stats.unpaidLeaves;
                    else if (basis === "OVERTIME_HOURS") statValue = stats.overtimeHours;

                    // 2. Determine Unit Rate (Hourly or Daily)
                    if (meta.calculationType === "HOURLY_RATE" || basis === "OVERTIME_HOURS") { // Default OT to Hourly
                        unitRate = hourlySalary;
                    } else {
                        unitRate = dailySalary; // Default Late/Absent to Daily
                    }

                    // 3. Apply Multiplier
                    // meta.value counts as the Multiplier here (e.g. 1.5x OT, 0.5x Late Deduction)
                    // If no value, assume 1.0 (Direct deduction/payment)
                    const multiplier = meta.value ? Number(meta.value) : 1.0;

                    amount = statValue * unitRate * multiplier;
                    description = `${basis} x ${multiplier}`;

                    if (emp.code === 'EMP001') {
                        console.log(`[DEBUG EMP001] Rule: ${rule.name} | Basis: ${basis} | Stat: ${statValue} | Rate: ${unitRate.toFixed(2)} | Mult: ${multiplier} | Amt: ${amount.toFixed(2)}`);
                    }

                    if (statValue > 0) {
                        amount = statValue * unitRate * multiplier;
                        description = `${statValue} x ${multiplier} x Rate`;
                    }
                } else {
                    if (emp.code === 'EMP001') console.log(`[DEBUG EMP001] SKIPPED Rule: ${rule.name} (No Basis found & Not Fixed/Percentage)`);
                }

                // --- ADD TO LIST ---
                if (amount > 0) {
                    const entry = {
                        name: rule.name,
                        amount: parseFloat(amount.toFixed(2)),
                        type: "AUTO",
                        meta: description
                    };

                    if (meta.category === "ALLOWANCE") {
                        allowanceList.push(entry);
                        totalAllowances += amount;
                    } else if (meta.category === "DEDUCTION") {
                        deductionList.push(entry);
                        totalDeductions += amount;
                    }
                }
            }

            // 4. Calculate Net
            const netSalary = basicSalary + totalAllowances - totalDeductions;

            // 5. Prepare Record
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

// --- API: Add Manual Adjustment ---
export const addAdjustment = async (req, res) => {
    try {
        const { payrollId, type, name, amount } = req.body;
        const payroll = await Payroll.findById(payrollId);

        if (!payroll) return res.status(404).json({ message: "Payroll record not found" });
        if (payroll.status !== "DRAFT") return res.status(400).json({ message: "Cannot adjust a finalized payroll." });

        const numAmount = Number(amount);

        if (type === "ALLOWANCE") {
            payroll.allowances.push({ name, amount: numAmount, type: "MANUAL" });
            payroll.totalAllowances = (payroll.totalAllowances || 0) + numAmount;
        } else {
            payroll.deductions.push({ name, amount: numAmount, type: "MANUAL" });
            payroll.totalDeductions = (payroll.totalDeductions || 0) + numAmount;
        }

        // Recalculate Net
        payroll.netSalary = payroll.basicSalary + payroll.totalAllowances - payroll.totalDeductions;

        await payroll.save();
        res.json({ message: "Adjustment Added Successfully", payroll });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// --- API: Finalize Payroll ---
export const finalizePayroll = async (req, res) => {
    try {
        const { month, year } = req.body;

        // Update all DRAFT records for this month to PROCESSED
        const result = await Payroll.updateMany(
            { month, year, status: "DRAFT" },
            { $set: { status: "PROCESSED" } }
        );

        if (result.matchedCount === 0) {
            return res.status(400).json({ message: "No Draft payroll records found to finalize." });
        }

        res.json({ message: `Success! Payroll Finalized for ${result.modifiedCount} employees. The payroll is now locked.` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- API: Export Payroll to Excel ---
export const exportPayroll = async (req, res) => {
    try {
        const { month, year } = req.query;
        const records = await Payroll.find({ month, year }).populate("employee", "name code designation department bankAccount iban");

        if (!records || records.length === 0) {
            return res.status(404).json({ message: "No payroll records found for this month." });
        }

        const data = records.map(r => ({
            "Employee ID": r.employee?.code || "N/A",
            "Name": r.employee?.name || "N/A",
            "Department": r.employee?.department || "N/A",
            "Designation": r.employee?.designation || "N/A",
            "Basic Salary": r.basicSalary || 0,
            "Total Allowances": r.totalAllowances || 0,
            "Total Deductions": r.totalDeductions || 0,
            "Net Salary": r.netSalary || 0,
            "Payment Status": r.status,
            "Bank Account": r.employee?.bankAccount || "",
            "IBAN": r.employee?.iban || ""
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, `Payroll_${month}_${year}`);

        const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

        res.setHeader("Content-Disposition", `attachment; filename="Payroll_${month}_${year}.xlsx"`);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.send(buffer);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Export failed: " + error.message });
    }
};

// --- API: Generate SIF File (WPS) ---
export const generateSIF = async (req, res) => {
    try {
        const { month, year } = req.query;
        // Fetch only PROCESSED (Finalized) records ideally, but DRAFT is ok for testing
        const records = await Payroll.find({ month, year }).populate("employee", "name code laborCardNumber bankAccount iban agentId");

        if (!records || records.length === 0) {
            return res.status(404).json({ message: "No payroll records found." });
        }

        // Standard WPS SIF Header (Example)
        // Format: SCR, EmployerID, BankCode, Date, Time, SalaryMonth, EDRCount, TotalSalary

        const employerId = "1234567890123"; // Retrieve from Master/Settings in real app
        const bankCode = "BANK001";
        const creationDate = new Date().toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
        const creationTime = new Date().toTimeString().slice(0, 5).replace(":", ""); // HHMM
        const salaryMonth = `${year}-${String(month).padStart(2, '0')}`; // YYYY-MM
        const totalAmount = records.reduce((sum, r) => sum + (r.netSalary || 0), 0);
        const recordCount = records.length;

        // --- NEW: JSON Format for Frontend Preview ---
        if (req.query.format === "json") {
            const previewData = records.map(r => ({
                "Employee": r.employee?.name || "N/A",
                "Code": r.employee?.code || "N/A",
                "IBAN/Account": r.employee?.iban || r.employee?.bankAccount || "N/A",
                "Total Net": (r.netSalary || 0).toFixed(2),
                "Basic": (r.basicSalary || 0).toFixed(2),
                "Allowances": (r.totalAllowances || 0).toFixed(2)
            }));
            return res.status(200).json({ success: true, data: previewData });
        }

        let sifContent = `SCR,${employerId},${bankCode},${creationDate},${creationTime},${salaryMonth},${recordCount},${totalAmount}\n`;

        // Body: EDR, PersonID, AgentID, Account, StartDate, EndDate, Days, Income, Basic, Extra, Deduction
        records.forEach(r => {
            const empId = r.employee?.laborCardNumber || r.employee?.code;
            const agentId = r.employee?.agentId || "AGENT001";
            const account = r.employee?.iban || r.employee?.bankAccount || "000000000000";
            const amount = (r.netSalary || 0).toFixed(2);

            const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
            const endDate = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;

            // Standard EDR line
            sifContent += `EDR,${empId},${agentId},${account},${startDate},${endDate},30,${amount},${r.basicSalary},${r.totalAllowances},0\n`;
        });

        res.setHeader("Content-Disposition", `attachment; filename="SIF_${employerId}_${creationDate}.csv"`);
        res.setHeader("Content-Type", "text/csv");
        res.send(sifContent);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "SIF Generation failed: " + error.message });
    }
};

// --- API: Generic MOL Compliance Report ---
export const generateMOLReport = async (req, res) => {
    try {
        const { month, year } = req.query;

        // 1. Get all active employees
        const employees = await Employee.find({ status: "Active" });

        // 2. Get payroll records for this month
        const payrolls = await Payroll.find({ month, year });
        const payrollMap = {};
        payrolls.forEach(p => {
            if (p.employee) payrollMap[p.employee.toString()] = p;
        });

        const reportData = employees.map(emp => {
            const payRecord = payrollMap[emp._id.toString()];
            const isPaid = payRecord && payRecord.status === "PROCESSED";

            return {
                "Employee ID": emp.code,
                "Name": emp.name,
                "Labor Card No.": emp.laborCardNumber || "N/A",
                "Contract Basic": emp.basicSalary,
                "Net Paid": payRecord ? payRecord.netSalary : 0,
                "Payment Status": isPaid ? "PAID" : "UNPAID / PENDING",
                "Month": `${month}/${year}`
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(reportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "MOL_Report");

        const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

        res.setHeader("Content-Disposition", `attachment; filename="MOL_Report_${month}_${year}.xlsx"`);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.send(buffer);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "MOL Report failed" });
    }
};

// --- API: Yearly Payment History ---
export const getPaymentHistory = async (req, res) => {
    try {
        const { year } = req.query;

        const records = await Payroll.find({ year, status: "PROCESSED" })
            .populate("employee", "name code department");

        if (records.length === 0) {
            return res.status(404).json({ message: `No payment history found for ${year}` });
        }

        const historyData = records.map(r => ({
            "Month": r.month,
            "Year": r.year,
            "Employee ID": r.employee?.code,
            "Name": r.employee?.name,
            "Department": r.employee?.department,
            "Basic Salary": r.basicSalary,
            "Allowances": r.totalAllowances,
            "Deductions": r.totalDeductions,
            "Net Paid": r.netSalary,
            "Processed Date": r.updatedAt ? r.updatedAt.toISOString().slice(0, 10) : "N/A"
        }));

        // Sort by Month then Name
        historyData.sort((a, b) => a.Month - b.Month);

        const worksheet = XLSX.utils.json_to_sheet(historyData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, `History_${year}`);

        const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

        res.setHeader("Content-Disposition", `attachment; filename="Payment_History_${year}.xlsx"`);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.send(buffer);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "History Export failed" });
    }
};
