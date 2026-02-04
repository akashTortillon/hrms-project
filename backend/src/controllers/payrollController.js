import Payroll from "../models/payrollModel.js";
import Employee from "../models/employeeModel.js";
import Master from "../models/masterModel.js";
import Attendance from "../models/attendanceModel.js";
import Request from "../models/requestModel.js";
import User from "../models/userModel.js";
import mongoose from "mongoose";
import SystemSettings from "../models/systemSettingsModel.js";
import * as XLSX from "xlsx";
import PayrollAudit from "../models/payrollAuditModel.js";

// --- HELPER: Calculate Attendance Stats ---
// --- HELPER: Parse "8h 45m" to decimal hours ---
// --- HELPER: Get Map of Approved Leaves for Multiple Employees ---
const getApprovedLeavesMap = async (employees) => {
    const emailToEmpId = {};
    const emails = [];
    employees.forEach(emp => {
        if (emp.email) {
            emailToEmpId[emp.email] = emp._id.toString();
            emails.push(emp.email);
        }
    });

    const users = await User.find({ email: { $in: emails } });
    const userIdToEmpId = {};
    const userIds = [];
    users.forEach(u => {
        userIdToEmpId[u._id.toString()] = emailToEmpId[u.email];
        userIds.push(u._id);
    });

    const requests = await Request.find({
        userId: { $in: userIds },
        requestType: "LEAVE",
        status: "APPROVED"
    });

    const map = {}; // empId -> [{start, end, leaveType}]
    requests.forEach(req => {
        const details = req.details || {};
        const startDate = details.startDate || details.fromDate;
        const endDate = details.endDate || details.toDate;

        if (startDate && endDate) {
            const empId = userIdToEmpId[req.userId.toString()];
            if (empId) {
                if (!map[empId]) map[empId] = [];
                const s = new Date(startDate);
                const e = new Date(endDate);
                s.setHours(0, 0, 0, 0);
                e.setHours(23, 59, 59, 999);
                map[empId].push({
                    start: s,
                    end: e,
                    leaveType: details.leaveType || details.leaveTypeId || "Unpaid Leave"
                });
            }
        }
    });
    return map;
};

// --- HELPER: Check if a date is within any leave range ---
const getLeaveInfo = (empId, dateStr, map) => {
    const ranges = map[empId.toString()];
    if (!ranges) return null;
    const d = new Date(dateStr);
    d.setHours(12, 0, 0, 0); // Mid-day check
    for (const r of ranges) {
        if (d >= r.start && d <= r.end) return r;
    }
    return null;
};

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
const getAttendanceStats = async (employeeId, month, year, preFetchedSettings = null, shiftMap = {}, debugInfo = null, leaveMap = {}, leaveRules = {}) => {
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

    // --- PHASE 1: BUILD DAY-BY-DAY STATUS ARRAY ---
    const dayStatuses = []; // Index 0 = Day 1
    const GLOBAL_STANDARD_HOURS = 9;

    // Helper to get hours for a specific shift name
    const getShiftHours = (shiftName) => {
        if (!shiftName || !shiftMap[shiftName]) return GLOBAL_STANDARD_HOURS;
        return Number(shiftMap[shiftName].workHours) || GLOBAL_STANDARD_HOURS;
    };

    let totalOvertimeHours = 0;

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${strMonth}-${String(day).padStart(2, '0')}`;
        const dateObj = new Date(year, month - 1, day);
        const dayOfWeek = dateObj.getDay(); // 0 = Sun

        let status = 'UNKNOWN'; // PRESENT, LATE, ABSENT, HOLIDAY, WEEKEND, PAID_LEAVE, UNPAID_LEAVE
        let isLate = false;
        let lateTier = 0;

        // A. Check Attendance Record
        if (logMap[dateStr]) {
            const record = logMap[dateStr];
            const recStatus = record.status;

            if (recStatus === 'Present' || recStatus === 'Late') {
                status = 'PRESENT';
                if (recStatus === 'Late') {
                    isLate = true;
                    lateTier = record.lateTier || 1;
                }
                // OT Calculation
                if (record.workHours) {
                    const worked = parseHours(record.workHours);
                    const shiftName = record.shift || "Day Shift";
                    const standardLimit = getShiftHours(shiftName);
                    if (worked > standardLimit) {
                        totalOvertimeHours += (worked - standardLimit);
                    }
                }
            } else if (recStatus === 'On Leave') {
                // If record says leave, check if Paid/Unpaid
                if (record.isPaid === false) status = 'UNPAID_LEAVE';
                else status = 'PAID_LEAVE';
            } else {
                status = 'ABSENT';
            }
        }

        // B. Check Approved Leave (Override if no present record)
        if (status === 'UNKNOWN' || status === 'ABSENT') {
            const leaveInfo = getLeaveInfo(employeeId, dateStr, leaveMap);
            if (leaveInfo) {
                // Resolved Paid/Unpaid Logic
                const typeName = leaveInfo.leaveType;
                let isPaid = true;
                if (typeName) {
                    if (leaveRules[typeName] !== undefined) isPaid = leaveRules[typeName];
                    else if (String(typeName).toLowerCase().includes('unpaid')) isPaid = false;
                }
                status = isPaid ? 'PAID_LEAVE' : 'UNPAID_LEAVE';
            }
        }

        // C. Fallbacks (Weekend/Holiday/Absent)
        if (status === 'UNKNOWN') {
            if (dayOfWeek === 0) status = 'WEEKEND'; // Sunday
            else if (holidaySet.has(dateStr)) status = 'HOLIDAY';
            else status = 'ABSENT';
        }

        dayStatuses.push({
            day,
            dateStr,
            status,
            isLate,
            lateTier
        });
    }

    // --- PHASE 2: APPLY SANDWICH RULE ---
    // Rule: If (ABSENT) -> [WEEKEND/HOLIDAY] -> (ABSENT), then [WEEKEND/HOLIDAY] becomes (UNPAID_LEAVE/SANDWICH)

    // Helper to get status for any date (including outside current month)
    const getStatusForDate = (dObj) => {
        const y = dObj.getFullYear();
        const m = String(dObj.getMonth() + 1).padStart(2, '0');
        const d = String(dObj.getDate()).padStart(2, '0');
        const dStr = `${y}-${m}-${d}`;
        const dayOfWeek = dObj.getDay();

        // 1. Check Log
        if (logMap[dStr]) {
            const r = logMap[dStr];
            if (r.status === 'Present' || r.status === 'Late') return 'PRESENT';
            if (r.status === 'On Leave') return r.isPaid === false ? 'UNPAID_LEAVE' : 'PAID_LEAVE';
            return 'ABSENT';
        }

        // 2. Check Leave Map (Assume we fetched enough? Or just basic check)
        // Note: getLeaveInfo uses the 'map' passed in. 
        // We might need to ensure 'leaveMap' covers adjacent months? 
        // getApprovedLeavesMap fetches ALL approved leaves for the employee ideally?
        // or ensure we requested enough. User's 'getApprovedLeavesMap' implementation fetches ALL matching user. 
        // So safe to assume we have it.
        const leaveInfo = getLeaveInfo(employeeId, dStr, leaveMap);
        if (leaveInfo) {
            const typeName = leaveInfo.leaveType;
            let isPaid = true;
            if (typeName) {
                if (leaveRules[typeName] !== undefined) isPaid = leaveRules[typeName];
                else if (String(typeName).toLowerCase().includes('unpaid')) isPaid = false;
            }
            return isPaid ? 'PAID_LEAVE' : 'UNPAID_LEAVE'; // Treat Unpaid Leave as Absent-equivalent for Sandwich
        }

        // 3. Fallback
        if (dayOfWeek === 0) return 'WEEKEND';
        // Need to check settings.holidays for this specific date
        // 'holidaySet' only has current month? 
        // We should check 'settings.holidays' raw array if available
        if (settings && settings.holidays) {
            const isHol = settings.holidays.some(h => {
                if (!h.date) return false;
                const hd = new Date(h.date);
                return hd.getFullYear() === y && hd.getMonth() === dObj.getMonth() && hd.getDate() === dObj.getDate();
            });
            if (isHol) return 'HOLIDAY';
        }

        return 'ABSENT'; // Default fallback if no logs/rules
    };

    const isAbsentOrLOP = (s) => s === 'ABSENT' || s === 'UNPAID_LEAVE' || s === 'SANDWICH_LEAVE';
    const isGap = (s) => s === 'WEEKEND' || s === 'HOLIDAY';

    console.log(`[DEBUG] Employee ${employeeId} (${month}/${year}) - Starting Sandwich Check (With Boundary Scan)`);

    let i = 0;
    while (i < dayStatuses.length) {
        if (isGap(dayStatuses[i].status)) {
            // Found start of a gap sequence
            let j = i;
            while (j < dayStatuses.length && isGap(dayStatuses[j].status)) {
                j++;
            }
            // Gap is from i to j-1

            // Check Left Side
            let leftIsAbsent = false;
            if (i > 0) {
                if (isAbsentOrLOP(dayStatuses[i - 1].status)) leftIsAbsent = true;
            } else {
                // BOUNDARY CHECK: Scan backwards from Day 1
                let backDate = new Date(year, month - 1, 1);
                backDate.setDate(backDate.getDate() - 1); // Last day of prev month

                // Scan up to 7 days back looking for non-gap
                for (let b = 0; b < 7; b++) {
                    const st = getStatusForDate(backDate);
                    if (!isGap(st)) {
                        if (isAbsentOrLOP(st)) leftIsAbsent = true;
                        break; // Found the anchor
                    }
                    backDate.setDate(backDate.getDate() - 1);
                }
            }

            // Check Right Side
            let rightIsAbsent = false;
            if (j < dayStatuses.length) {
                if (isAbsentOrLOP(dayStatuses[j].status)) rightIsAbsent = true;
            } else {
                // BOUNDARY CHECK: Scan forwards from End of Month
                let fwdDate = new Date(year, month - 1, daysInMonth);
                fwdDate.setDate(fwdDate.getDate() + 1); // First day of next month

                for (let f = 0; f < 7; f++) {
                    const st = getStatusForDate(fwdDate);
                    if (!isGap(st)) {
                        if (isAbsentOrLOP(st)) rightIsAbsent = true;
                        break;
                    }
                    fwdDate.setDate(fwdDate.getDate() + 1);
                }
            }

            console.log(`[DEBUG] Gap found Days ${i + 1} to ${j}: Left=${leftIsAbsent}, Right=${rightIsAbsent}`);

            if (leftIsAbsent && rightIsAbsent) {
                for (let k = i; k < j; k++) {
                    dayStatuses[k].status = 'SANDWICH_LEAVE';
                    console.log(`  -> Day ${k + 1} marked SANDWICH`);
                }
            }

            i = j; // Advance
        } else {
            i++;
        }
    }

    // --- PHASE 3: CALCULATE METRICS ---
    let paidDays = 0;
    let lopDays = 0;
    let lateCount = 0;
    let lateTier1 = 0, lateTier2 = 0, lateTier3 = 0;
    let unpaidLeavesCount = 0;
    let paidLeavesCount = 0;

    dayStatuses.forEach(d => {
        // console.log(`[DEBUG] Day ${d.day}: ${d.status}`);
        switch (d.status) {
            case 'PRESENT':
                paidDays++;
                console.log(`[DEBUG] Day ${d.day} is PRESENT (+Paid)`);
                if (d.isLate) {
                    lateCount++;
                    if (d.lateTier === 1) lateTier1++;
                    else if (d.lateTier === 2) lateTier2++;
                    else if (d.lateTier >= 3) lateTier3++;
                }
                break;
            case 'PAID_LEAVE':
                paidDays++;
                paidLeavesCount++;
                console.log(`[DEBUG] Day ${d.day} is PAID_LEAVE (+Paid)`);
                break;
            case 'WEEKEND':
            case 'HOLIDAY':
                paidDays++;
                console.log(`[DEBUG] Day ${d.day} is ${d.status} (+Paid)`);
                break;
            case 'UNPAID_LEAVE':
                unpaidLeavesCount++;
                // lopDays++; // Removed to prevent double counting in generatePayroll (which adds Absent + Unpaid)
                break;
            case 'SANDWICH_LEAVE': // Treated as Unpaid
                unpaidLeavesCount++; // Or separate 'sandwichLeavesCount'?
                // lopDays++; // Removed
                break;
            case 'ABSENT':
                lopDays++;
                break;
        }
    });

    return {
        totalDays: daysInMonth,
        daysPresent: paidDays, // Note: Present includes weekends/holidays/paid leaves in terms of "Days Paid" usually? 
        // Wait, previously paidDays meant "Days to be Paid for".
        // PRESENT, WEEKEND, HOLIDAY, PAID_LEAVE all contribute to Salary (if 30 day basis).
        // ABSENT, UNPAID_LEAVE, SANDWICH reduce from 30? Or if 'paidDays' is solely 'Worked Days'?
        // Logic in generatePayroll uses `dailySalary = basic / 30`.
        // So normally everyone gets 30 days pay unless LOP exists.
        // The `paidDays` returned here seems to track "Credits". 
        // Let's stick to: paidDays = (Present + Weekend + Holiday + PaidLeave).
        // lopDays = (Absent + UnpaidLeave + Sandwich).

        // Wait! previous logic:
        // if (isDayPresent) paidDays++;
        // else if (isDayPaidLeave) paidDays++;
        // else if (isDayUnpaidLeave) lopDays++;
        // else if (Sunday || Holiday) paidDays++;
        // else lopDays++;

        // Yes, my switch case matches this logic.

        daysPresent: paidDays, // This variable name in return object is slightly misleading if it includes weekends, but standard in this codebase seems to be "Days Payable"
        daysAbsent: lopDays,
        unpaidLeaves: unpaidLeavesCount,
        paidLeaves: paidLeavesCount,
        overtimeHours: parseFloat(totalOvertimeHours.toFixed(2)),
        late: lateCount,
        lateTier1,
        lateTier2,
        lateTier3
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

        // ✅ NEW: Pre-fetch LEAVE RULES for Paid/Unpaid logic
        const payrollRules = await Master.find({ type: "PAYROLL_RULE", isActive: true });
        const leaveRulesMap = {}; // leaveTypeId -> isPaid
        const masterLeaveTypes = await Master.find({ type: "LEAVE_TYPE" }); // To map IDs to Names if needed

        payrollRules.forEach(r => {
            if (r.metadata && r.metadata.type === 'LEAVE_CONFIG') {
                // Try to resolve "isPaid"
                let isPaid = true;
                if (r.metadata.isPaid !== undefined) isPaid = r.metadata.isPaid;
                else if (r.name.toLowerCase().includes('unpaid')) isPaid = false;

                // Map by Leave Type ID if available
                if (r.metadata.leaveTypeId) {
                    leaveRulesMap[r.metadata.leaveTypeId.toString()] = isPaid;
                    // Also find Name
                    const typeName = masterLeaveTypes.find(t => t._id.toString() === r.metadata.leaveTypeId.toString())?.name;
                    if (typeName) leaveRulesMap[typeName] = isPaid;
                }
            }
        });

        // ✅ NEW: Fetch Approved Leave Map
        const approvedLeaveMap = await getApprovedLeavesMap(employees);

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
            const stats = await getAttendanceStats(
                emp._id, month, year,
                settings, shiftMap,
                { code: emp.code },
                approvedLeaveMap,
                leaveRulesMap
            );

            // --- 2.5 SHIFT-BASED PENALTIES (Dynamic Late Deduction) ---
            // If the employee's shift has a "latePolicy", we apply it here.
            // This overrides or adds to standard deductions?
            // "Inegrated with Late Count" -> If we apply specific penalties, we might skip the generic "LATE_COUNT" rule later?
            // Or let them coexist? Usually specific overrides generic.
            // Let's implement as: If shift penalties found, apply them.
            // NOTE: This logic assumes 'stats' tracks counts for tier1, tier2, tier3.

            const empShiftMeta = shiftMap[empShiftName] || {};
            const latePolicy = empShiftMeta.latePolicy || [];
            let shiftPenaltyApplied = false;

            if (latePolicy.length > 0) {
                // Policy: [{ tier: 1, type: 'FIXED', value: 10 }, ...]
                let penaltyAmount = 0;
                let penaltyDescParts = [];

                // Calculate for Tier 1
                if (stats.lateTier1 > 0) {
                    const rule = latePolicy.find(p => p.tier === 1);
                    if (rule) {
                        const val = Number(rule.value || 0);
                        let subTotal = 0;
                        if (rule.type === 'FIXED') subTotal = stats.lateTier1 * val;
                        else if (rule.type === 'PERCENTAGE') subTotal = stats.lateTier1 * (basicSalary * val / 100); // % of Monthly Basic per instance? Or Pro-rated? Let's assume % of Basic.
                        else if (rule.type === 'DAILY_RATE') subTotal = stats.lateTier1 * (dailySalary * val);

                        if (subTotal > 0) {
                            penaltyAmount += subTotal;
                            penaltyDescParts.push(`${stats.lateTier1}x T1`);
                        }
                    }
                }
                // Calculate for Tier 2
                if (stats.lateTier2 > 0) {
                    const rule = latePolicy.find(p => p.tier === 2);
                    if (rule) {
                        const val = Number(rule.value || 0);
                        let subTotal = 0;
                        if (rule.type === 'FIXED') subTotal = stats.lateTier2 * val;
                        else if (rule.type === 'PERCENTAGE') subTotal = stats.lateTier2 * (basicSalary * val / 100);
                        else if (rule.type === 'DAILY_RATE') subTotal = stats.lateTier2 * (dailySalary * val);

                        if (subTotal > 0) {
                            penaltyAmount += subTotal;
                            penaltyDescParts.push(`${stats.lateTier2}x T2`);
                        }
                    }
                }
                // Calculate for Tier 3
                if (stats.lateTier3 > 0) {
                    const rule = latePolicy.find(p => p.tier === 3);
                    if (rule) {
                        const val = Number(rule.value || 0);
                        let subTotal = 0;
                        if (rule.type === 'FIXED') subTotal = stats.lateTier3 * val;
                        else if (rule.type === 'PERCENTAGE') subTotal = stats.lateTier3 * (basicSalary * val / 100);
                        else if (rule.type === 'DAILY_RATE') subTotal = stats.lateTier3 * (dailySalary * val);

                        if (subTotal > 0) {
                            penaltyAmount += subTotal;
                            penaltyDescParts.push(`${stats.lateTier3}x T3`);
                        }
                    }
                }

                if (penaltyAmount > 0) {
                    deductionList.push({
                        name: "Late Penalty (Shift Policy)",
                        amount: parseFloat(penaltyAmount.toFixed(2)),
                        type: "AUTO",
                        meta: penaltyDescParts.join(', ')
                    });
                    totalDeductions += penaltyAmount;
                    shiftPenaltyApplied = true;
                }
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
                } else if (meta.calculationType === "PERCENTAGE") {
                    amount = basicSalary * (Number(meta.value) / 100);
                    description = `${meta.value}% of Basic`;
                }

                // Case B: Statistic Based (Hourly/Daily/Instance)
                else if (basis) {
                    let statValue = 0;
                    let unitRate = 0;

                    // 1. Get the Statistic Value
                    if (basis === "LATE_COUNT") {
                        // If shift penalty applied, do we skip generic count? 
                        // User asked for "integrated".
                        // Logic: If specific penalties applied (shiftPenaltyApplied=true), skip generic "Late Count" rule.
                        if (shiftPenaltyApplied) continue;

                        statValue = stats.late;
                        if (statValue > 0) description = `${statValue} Days Late`;
                    }
                    else if (basis === "LATE_TIER_1_COUNT") {
                        if (shiftPenaltyApplied) continue; // Skip if handled by Shift Policy
                        statValue = stats.lateTier1;
                        if (statValue > 0) description = `${statValue} Days Late (Tier 1)`;
                    }
                    else if (basis === "LATE_TIER_2_COUNT") {
                        if (shiftPenaltyApplied) continue; // Skip if handled by Shift Policy
                        statValue = stats.lateTier2;
                        if (statValue > 0) description = `${statValue} Days Late (Tier 2)`;
                    }
                    else if (basis === "LATE_TIER_3_COUNT") {
                        if (shiftPenaltyApplied) continue; // Skip if handled by Shift Policy
                        statValue = stats.lateTier3;
                        if (statValue > 0) description = `${statValue} Days Late (Tier 3)`;
                    }
                    else if (basis === "ABSENT_DAYS") {
                        statValue = stats.daysAbsent + stats.unpaidLeaves;
                        if (statValue > 0) {
                            const parts = [];
                            if (stats.daysAbsent > 0) parts.push(`${stats.daysAbsent} Absent`);
                            if (stats.unpaidLeaves > 0) parts.push(`${stats.unpaidLeaves} Unpaid Leave`);
                            description = parts.join(' + ');
                        }
                    }
                    else if (basis === "OVERTIME_HOURS") {
                        statValue = stats.overtimeHours;
                        if (statValue > 0) description = `${statValue} Hrs OT`;
                    }

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

                    if (statValue > 0) {
                        amount = statValue * unitRate * multiplier;
                        // Append rate info if complex
                        if (multiplier !== 1) description += ` (x${multiplier})`;
                    }
                } else {
                    // Skipped Rule (No Basis found & Not Fixed/Percentage)
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

            // 3.5. SALARY ADVANCE & LOAN DEDUCTIONS
            // Find User for this employee to get Requests
            const user = await User.findOne({ email: emp.email });
            if (user) {
                const requests = await Request.find({
                    userId: user._id,
                    requestType: "SALARY",
                    status: "APPROVED",
                    isFullyPaid: { $ne: true }
                });

                for (const req of requests) {
                    const { amount, repaymentPeriod, totalRepaymentAmount } = req.details || {};
                    const principal = Number(amount) || 0;
                    const totalPayable = Number(totalRepaymentAmount) || principal; // Fallback to principal if no interest
                    const period = Number(repaymentPeriod) || 1;

                    // Logic: Deduction Amount
                    let deductionAmount = 0;
                    const alreadyPaid = req.payrollDeductions ? req.payrollDeductions.reduce((sum, d) => sum + d.amount, 0) : 0;
                    const remaining = totalPayable - alreadyPaid;

                    if (remaining <= 0) continue; // Should be handled by isFullyPaid, but safety check

                    if (req.subType === "salary_advance") {
                        // Assumption: One-time deduction unless period > 1 specified
                        if (period > 1) {
                            const installment = totalPayable / period;
                            deductionAmount = Math.min(installment, remaining);
                        } else {
                            deductionAmount = remaining; // Full deduction
                        }
                    } else if (req.subType === "loan") {
                        const installment = totalPayable / period;
                        deductionAmount = Math.min(installment, remaining);
                    }

                    // Check if this specific month/year was already deducted (idempotency for re-runs)
                    // We don't save to Request yet (that's finalize), so we just add to current payroll draft.
                    // But if we already Finalized a payroll for this month, generatePayroll shouldn't define it again?
                    // generatePayroll creates DRAFT. If previous finalized payroll exists for this month, user handles it.

                    if (deductionAmount > 0) {
                        deductionList.push({
                            name: req.subType === 'loan' ? `Loan Repayment (${req.requestId})` : `Salary Advance (${req.requestId})`,
                            amount: parseFloat(deductionAmount.toFixed(2)),
                            type: "AUTO",
                            meta: `Req ID: ${req.requestId} | Remaining: ${parseFloat((remaining - deductionAmount).toFixed(2))}`
                        });
                        totalDeductions += deductionAmount;
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

            // AUDIT LOG
            await PayrollAudit.create({
                action: "GENERATED",
                performedBy: req.user ? req.user._id : null,
                performedByName: req.user ? req.user.name : "System",
                month,
                year,
                details: `Generated payroll for ${payrollRecords.length} employees`,
                totalEmployees: payrollRecords.length
            });
        }

        res.status(200).json({
            message: `Payroll Generated for ${employees.length} employees`,
            month,
            year
        });

    } catch (error) {
        // console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// --- API: Get Payroll Summary ---
export const getPayrollSummary = async (req, res) => {
    try {
        const { month, year } = req.query;
        const records = await Payroll.find({ month, year })
            .populate("employee", "name code department designation role")
            .populate("allowances.addedBy", "name") // ✅ Populate Allowance Editor
            .populate("deductions.addedBy", "name"); // ✅ Populate Deduction Editor

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

// --- API: Get Audit Logs for a Specific Payroll Record ---
export const getPayrollAuditLogs = async (req, res) => {
    try {
        const { payrollId } = req.query;
        if (!payrollId) return res.status(400).json({ message: "Payroll ID is required" });

        const logs = await PayrollAudit.find({ relatedPayrollId: payrollId })
            .sort({ createdAt: -1 })
            .populate("performedBy", "name"); // Get User Name

        res.status(200).json(logs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- API: Add Manual Adjustment ---
export const addAdjustment = async (req, res) => {
    try {
        const { payrollId, type, name, amount, reason } = req.body;
        const payroll = await Payroll.findById(payrollId);

        if (!payroll) return res.status(404).json({ message: "Payroll record not found" });
        if (payroll.status !== "DRAFT") return res.status(400).json({ message: "Cannot adjust a finalized payroll." });

        // ✅ Enforce Mandatory Reason
        if (!reason || reason.trim() === "") {
            return res.status(400).json({ message: "Reason is required for manual adjustments." });
        }

        const numAmount = Number(amount);

        const newItem = {
            name,
            amount: numAmount,
            type: "MANUAL",
            // ✅ Manual Tracking
            addedBy: req.user._id,
            addedAt: new Date(),
            reason: reason
        };

        if (type === "ALLOWANCE") {
            payroll.allowances.push(newItem);
            payroll.totalAllowances = (payroll.totalAllowances || 0) + numAmount;
        } else {
            payroll.deductions.push(newItem);
            payroll.totalDeductions = (payroll.totalDeductions || 0) + numAmount;
        }

        // Recalculate Net
        payroll.netSalary = payroll.basicSalary + payroll.totalAllowances - payroll.totalDeductions;

        await payroll.save();

        // AUDIT LOG
        await PayrollAudit.create({
            action: "ADJUSTMENT",
            performedBy: req.user ? req.user._id : null,
            performedByName: req.user ? req.user.name : "System",
            month: payroll.month,
            year: payroll.year,
            details: `Manual adjustment [${type}]: ${name} (${amount}) for Payroll ID ${payrollId}`,
            relatedPayrollId: payrollId // ✅ Link to Payroll
        });

        res.json({ message: "Adjustment Added Successfully", payroll });

    } catch (error) {
        // console.error(error);
        res.status(500).json({ message: error.message });
    }
};


// --- API: Remove Payroll Item (Skip Deduction) ---
export const removePayrollItem = async (req, res) => {
    try {
        const { payrollId, itemId, type } = req.body; // type: 'ALLOWANCE' or 'DEDUCTION'
        const payroll = await Payroll.findById(payrollId);

        if (!payroll) return res.status(404).json({ message: "Payroll record not found" });
        if (payroll.status !== "DRAFT") return res.status(400).json({ message: "Cannot edit a finalized payroll." });

        let removedAmount = 0;
        let removedName = "Unknown Item";

        if (type === "ALLOWANCE") {
            const itemIndex = payroll.allowances.findIndex(i => i._id.toString() === itemId);
            if (itemIndex > -1) {
                removedAmount = payroll.allowances[itemIndex].amount;
                removedName = payroll.allowances[itemIndex].name;
                payroll.allowances.splice(itemIndex, 1);
                payroll.totalAllowances -= removedAmount;
            }
        } else {
            const itemIndex = payroll.deductions.findIndex(i => i._id.toString() === itemId);
            if (itemIndex > -1) {
                removedAmount = payroll.deductions[itemIndex].amount;
                removedName = payroll.deductions[itemIndex].name;
                payroll.deductions.splice(itemIndex, 1);
                payroll.totalDeductions -= removedAmount;
            }
        }

        // Recalculate Net
        payroll.netSalary = payroll.basicSalary + payroll.totalAllowances - payroll.totalDeductions;
        await payroll.save();

        // AUDIT LOG
        await PayrollAudit.create({
            action: "ADJUSTMENT",
            performedBy: req.user ? req.user._id : null,
            performedByName: req.user ? req.user.name : "System",
            month: payroll.month,
            year: payroll.year,
            details: `Manual removal [${type}]: ${removedName} (${removedAmount}) for Payroll ID ${payrollId}`,
            relatedPayrollId: payrollId // ✅ Link to Payroll
        });

        res.json({ message: "Item removed successfully", payroll });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- API: Finalize Payroll ---
export const finalizePayroll = async (req, res) => {
    try {
        const { month, year } = req.body;

        // 1. Fetch DRAFT records to process
        const records = await Payroll.find({ month, year, status: "DRAFT" });

        if (records.length === 0) {
            return res.status(400).json({ message: "No Draft payroll records found to finalize." });
        }

        // 2. Update Request Models (for Loans/Advances)
        // Find any payroll records that had loan/advance deductions
        for (const p of records) {
            // Find User for this employee (needed to link back to Request userId, or use Employee ID if we linking differently)
            // Requests are linked by userId. Employee model has email. User has email.
            // Let's rely on finding User by EmployeeId if we stored it, or by Email.
            // Simpler: The deduction meta has "Req ID: REQ001". We can find by that directly!

            const loanDeductions = p.deductions.filter(d =>
                (d.name.includes("Loan Repayment") || d.name.includes("Salary Advance"))
                && d.meta && d.meta.includes("Req ID:")
            );

            for (const ded of loanDeductions) {
                const reqIdMatch = ded.meta.match(/Req ID: (REQ\d+)/);
                const reqId = reqIdMatch ? reqIdMatch[1] : null;

                if (reqId) {
                    const request = await Request.findOne({ requestId: reqId });

                    if (request) {
                        // Check if this deduction is already recorded (idempotency)
                        const alreadyRecorded = request.payrollDeductions.some(pd => pd.month == month && pd.year == year);

                        if (!alreadyRecorded) {
                            request.payrollDeductions.push({
                                month,
                                year,
                                amount: ded.amount,
                                date: new Date()
                            });

                            // Check if fully paid
                            const totalPaid = request.payrollDeductions.reduce((sum, x) => sum + x.amount, 0);
                            if (totalPaid >= (request.details.amount - 1)) { // Tolerance of 1 for rounding
                                request.isFullyPaid = true;
                                request.status = "COMPLETED";
                            }

                            await request.save();
                        }
                    }
                }
            }
        }

        // 3. Mark as Processed
        for (const p of records) {
            p.status = "PROCESSED";
            await p.save();
        }

        res.json({ message: `Success! Payroll Finalized for ${records.length} employees. The payroll is now locked.` });

        // AUDIT LOG
        await PayrollAudit.create({
            action: "FINALIZED",
            performedBy: req.user ? req.user._id : null,
            performedByName: req.user ? req.user.name : "System",
            month,
            year,
            details: `Finalized payroll for ${records.length} records`
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- API: Export Payroll to Excel ---
export const exportPayroll = async (req, res) => {
    try {
        const { month, year } = req.query;
        // Populate fields needed for the report
        const records = await Payroll.find({ month, year }).populate("employee", "name code designation department bankAccount iban bankName laborCardNumber personalId");

        if (!records || records.length === 0) {
            return res.status(404).json({ message: "No payroll records found for this month." });
        }

        // --- Prepare Data for Excel ---
        const monthNames = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
        const monthName = monthNames[parseInt(month) - 1] || "UNKNOWN";

        // Company Constants (Hardcoded as per request image)
        const COMPANY_NAME = "COMPANY NAME: LEPTIS HYPERMARKET LLC";
        const MOL_ID = "MOL ID No. 0000001564503";
        const REPORT_TITLE = `PAYROLL FOR THE MONTH OF ${monthName} - ${year}`;

        // 1. Define the Array of Arrays (AoA) Structure
        const aoa = [];

        // Row 1: Company Name
        aoa.push([COMPANY_NAME]);
        // Row 2: MOL ID
        aoa.push([MOL_ID]);
        // Row 3: Report Title
        aoa.push([REPORT_TITLE]);
        // Row 4: Empty space
        aoa.push([]);

        // Row 5: Column Headers Top
        const headerRowTop = [
            "Sl.No",
            "NAME OF THE EMPLOYEE",
            "WORK PERMIT NO (8 DIGIT NO)",
            "PERSONAL NO (14 DIGIT NO)",
            "BANK NAME",
            "FAB CARD NO(16 DIGITS)\nOR IBAN FOR PERSONAL",
            "LOP DAYS",          // Renamed for clarity
            "PAID LEAVES",       // ✅ NEW
            "Employee's Net Salary", // Merged Header
            "",
            ""
        ];
        aoa.push(headerRowTop);

        // Row 6: Column Headers Bottom (Sub-headers)
        const headerRowBottom = [
            "", "", "", "", "", "", "", "", // Empty for merged columns
            "Fixed",
            "Variable",
            "Total"
        ];
        aoa.push(headerRowBottom);

        // Data Rows
        let serialNo = 1;
        records.forEach(r => {
            const emp = r.employee || {};

            // Calc Salary Components
            const fixed = r.basicSalary || 0;
            const net = r.netSalary || 0;
            // Assuming Variable = Net - Fixed (includes allowances - deductions + OT)
            // Ensure no negative variable if net < basic (e.g. absent) might look weird, but mathematically correct for "balancing"
            let variable = net - fixed;

            // Format to 2 decimals
            // variable = parseFloat(variable.toFixed(2));

            // "NO OF DAYS" -> Using LOP (Loss of Pay) or 0 if user wants "Days Absent"? 
            // Image shows "0" for full salary. Let's assume it means "LOP Days".
            // r.attendanceSummary might have daysAbsent.
            const lopDays = r.attendanceSummary ? (r.attendanceSummary.daysAbsent + r.attendanceSummary.unpaidLeaves) : 0;
            const paidLeaves = r.attendanceSummary ? (r.attendanceSummary.paidLeaves || 0) : 0; // ✅ NEW

            const row = [
                serialNo++,                          // Sl.No
                emp.name || "Unknown",               // Name
                emp.laborCardNumber || "Not Provided",           // Work Permit
                emp.personalId || "Not Provided",                // Personal No
                emp.bankName || "Not Provided",                  // Bank Name
                emp.iban || emp.bankAccount || "Not Provided",   // FAB/IBAN
                lopDays,                             // LOP Days
                paidLeaves,                          // Paid Leaves
                fixed,                               // Fixed
                variable,                            // Variable
                net                                  // Total
            ];
            aoa.push(row);
        });

        // 2. Create Sheet
        const worksheet = XLSX.utils.aoa_to_sheet(aoa);

        // 3. Define Merges
        // s: start, e: end. r: row, c: col (0-indexed)
        const merges = [
            // Header: Company Name (Row 0, Cols A-J)
            { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
            // Header: MOL ID (Row 1, Cols A-J)
            { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } },
            // Header: Report Title (Row 2, Cols A-J)
            { s: { r: 2, c: 0 }, e: { r: 2, c: 9 } },

            // Table Headers (Row 4 & 5)
            // Sl.No (A5:A6) -> r4,c0 to r5,c0
            { s: { r: 4, c: 0 }, e: { r: 5, c: 0 } },
            // Name (B5:B6)
            { s: { r: 4, c: 1 }, e: { r: 5, c: 1 } },
            // Work Permit
            { s: { r: 4, c: 2 }, e: { r: 5, c: 2 } },
            // Personal No
            { s: { r: 4, c: 3 }, e: { r: 5, c: 3 } },
            // Bank Name
            { s: { r: 4, c: 4 }, e: { r: 5, c: 4 } },
            // FAB/IBAN
            { s: { r: 4, c: 5 }, e: { r: 5, c: 5 } },
            // NO OF DAYS
            { s: { r: 4, c: 6 }, e: { r: 5, c: 6 } },
            // Employee's Net Salary (H5:J5) -> Horizontal Merge
            { s: { r: 4, c: 7 }, e: { r: 4, c: 9 } }
        ];

        worksheet['!merges'] = merges;

        // 4. Set Column Widths (Approximation)
        worksheet['!cols'] = [
            { wch: 5 },  // Sl.No
            { wch: 30 }, // Name
            { wch: 15 }, // Work Permit
            { wch: 18 }, // Personal No
            { wch: 10 }, // Bank Name
            { wch: 25 }, // FAB/IBAN
            { wch: 10 }, // No Of Days
            { wch: 10 }, // Fixed
            { wch: 10 }, // Variable
            { wch: 10 }  // Total
        ];

        // 5. Build Workbook
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, `Payroll_${month}_${year}`);

        const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

        res.setHeader("Content-Disposition", `attachment; filename="Payroll_Export_${month}_${year}.xlsx"`);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

        // AUDIT LOG
        PayrollAudit.create({
            action: "EXPORTED",
            performedBy: req.user ? req.user._id : null,
            performedByName: req.user ? req.user.name : "System",
            month,
            year,
            details: "Exported Payroll Excel Report"
        }).catch(console.error);

        res.send(buffer);

    } catch (error) {
        // console.error(error);
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

        // AUDIT LOG
        PayrollAudit.create({
            action: "SIF_GENERATED",
            performedBy: req.user ? req.user._id : null,
            performedByName: req.user ? req.user.name : "System",
            month,
            year,
            details: `Generated SIF File: SIF_${employerId}_${creationDate}.csv`,
            totalNetSalary: totalAmount
        }).catch(console.error);

        res.send(sifContent);

    } catch (error) {
        // console.error(error);
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
