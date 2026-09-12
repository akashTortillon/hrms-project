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
import PDFDocument from "pdfkit";
import { PDFDocument as PDFLibDocument } from "pdf-lib";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { buildZipArchive } from "../utils/zip.js";
import { logActivity } from "../utils/activityLogger.js";
import { holidaySetFromHolidays, isWeekOff, applyMonthlyFlexQuota } from "../utils/attendanceUtils.js";
import { resolveCompanyLogoBuffer } from "./masterController.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const toNumber = (value) => Number(String(value || 0).replace(/[^0-9.-]+/g, "")) || 0;
const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Round to 2 decimal places (currency). Used so a payroll's totalAllowances /
// totalDeductions / netSalary are always the exact sum of the 2dp-rounded line
// items shown on the payslip - previously the totals accumulated raw floats while
// each line item was stored rounded, so e.g. a 980.00 manual deduction could show
// up in the total as 979.997 once an auto item with a repeating-decimal amount
// (anything derived from basicSalary / 30) had been added and later removed.
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
// Sum a payslip's line items the same way the payslip renders them: each amount
// rounded to 2dp first, then the total rounded - so "Total" always equals the sum
// of the printed rows.
const sumAmounts = (items = []) => round2((items || []).reduce((s, i) => s + round2(Number(i?.amount || 0)), 0));

const resolveCompanyLogoPath = (companyImage) => {
    if (!companyImage || /^https?:\/\//i.test(companyImage)) return null;

    const normalized = String(companyImage).replace(/^\/+/, "");
    const candidates = [
        path.join(__dirname, "..", normalized),
        path.join(__dirname, "..", "..", normalized),
        path.join(__dirname, "..", "..", "hr_and_asset_mgt", "public", normalized),
        path.join(__dirname, "..", "..", "hr_and_asset_mgt", "public", path.basename(normalized))
    ];

    return candidates.find((candidate) => {
        const ext = path.extname(candidate).toLowerCase();
        return [".png", ".jpg", ".jpeg"].includes(ext) && fs.existsSync(candidate);
    }) || null;
};

// Company Master logos (Masters > Company Structure) are uploaded to a private S3
// bucket and stored as unsigned https:// URLs - a plain fetch() 403s, and pdfkit's
// doc.image() can only embed a local file path or a Buffer anyway, not a remote
// URL. resolveCompanyLogoBuffer (masterController.js) presigns the URL and fetches
// it - the same helper the browser-facing logo proxy route uses. Without this,
// every company's S3-hosted logo silently failed to embed on the pdfkit payslip,
// and the legacy process.env.COMPANY_LOGO local-file fallback (left over from
// before the S3 migration, pointing at another tenant's logo) rendered instead.
const fetchRemoteLogoBuffer = async (imageUrl) => {
    const logo = await resolveCompanyLogoBuffer(imageUrl);
    return logo?.buffer || null;
};

const getPayrollCycleKey = (month, year) => (Number(year) * 100) + Number(month);

// Midnight-normalized day formatter/parser — periods are whole days, so all
// period-boundary comparisons happen at day granularity, not exact timestamps.
// parseCalendarDay reads "YYYY-MM-DD" strings via the local Date(y,m,d) constructor
// (not `new Date(string)`, which parses date-only strings as UTC) so the calendar
// day the user typed is preserved exactly regardless of server timezone — mixing
// UTC string-parsing with local getters/setters is what caused a saved date to
// silently shift back a day on read.
const parseCalendarDay = (d) => {
    if (d instanceof Date) return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const match = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return new Date(d);
};
const toDayStart = (d) => { const x = parseCalendarDay(d); x.setHours(0, 0, 0, 0); return x; };
const toDayEnd = (d) => { const x = parseCalendarDay(d); x.setHours(23, 59, 59, 999); return x; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const formatYMD = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
};

// Finds the furthest-out finalized payroll period (by periodEnd date, not by when
// the finalize action was logged — periods can be finalized out of order) so the
// lockout always reflects the actual latest locked period, not a hardcoded cutoff
// day. Legacy audit rows from before rolling periods existed only have month/year —
// for those, periodEnd is synthesized as the last calendar day of that month so old
// finalizations still lock correctly under the new date-based comparison.
const getLatestFinalizedCycle = async () => {
    // ANCHOR_SET entries participate too — an admin-set starting anchor moves the
    // lockout cursor exactly like a real finalize would, without any actual
    // Payroll records existing for it.
    const entries = await PayrollAudit
        .find({ action: { $in: ["FINALIZED", "ANCHOR_SET"] } })
        .select("action month year periodStart periodEnd createdAt")
        .sort({ createdAt: -1 });

    if (!entries.length) return null;

    const toResult = (entry) => {
        const periodEnd = entry.periodEnd
            ? toDayEnd(entry.periodEnd)
            : toDayEnd(new Date(Number(entry.year), Number(entry.month), 0));
        const periodStart = entry.periodStart ? toDayStart(entry.periodStart) : null;
        return {
            month: Number(entry.month),
            year: Number(entry.year),
            periodStart,
            periodEnd,
            // Plain "YYYY-MM-DD" strings alongside the Date objects — lets the
            // frontend compare against its own date-input state directly instead
            // of reconstructing Date objects client-side (browser/server timezone
            // drift risk otherwise).
            periodStartStr: periodStart ? formatYMD(periodStart) : null,
            periodEndStr: formatYMD(periodEnd),
            finalizedAt: entry.createdAt
        };
    };

    // FINALIZED entries can legitimately land out of order (a later period gets
    // finalized before an earlier gap is backfilled), so among those the
    // furthest-out periodEnd always wins — the lockout must never silently move
    // backward past real, already-processed payroll.
    //
    // ANCHOR_SET is different: it's an explicit admin correction tool (Masters >
    // System Settings > Set Anchor). Each click is a fresh override of wherever
    // the anchor currently sits, so only the MOST RECENTLY SET anchor should ever
    // count — not whichever historical anchor-set happens to have the latest
    // periodEnd. Without this, correcting the anchor to an earlier date than a
    // prior (possibly mistaken) anchor-set would silently keep showing the old
    // value after refresh, which is exactly the reported bug.
    const latestAnchorSet = entries.find((e) => e.action === "ANCHOR_SET");
    const latestFinalized = entries
        .filter((e) => e.action === "FINALIZED")
        .reduce((latest, entry) => {
            const candidate = toResult(entry);
            if (!latest || candidate.periodEnd > latest.periodEnd) return candidate;
            return latest;
        }, null);

    const anchorResult = latestAnchorSet ? toResult(latestAnchorSet) : null;

    if (!anchorResult) return latestFinalized;
    if (!latestFinalized) return anchorResult;
    return anchorResult.periodEnd >= latestFinalized.periodEnd ? anchorResult : latestFinalized;
};

const hasScheduledSkip = (details = {}, month, year) => {
    const overrides = Array.isArray(details.repaymentScheduleOverrides) ? details.repaymentScheduleOverrides : [];
    return overrides.some((entry) =>
        entry?.action === "SKIP"
        && Number(entry.month) === Number(month)
        && Number(entry.year) === Number(year)
    );
};

const resolveEffectiveSalary = (employee, asOfDate) => {
    const periodEnd = toDayEnd(asOfDate);
    const history = [...(employee.salaryHistory || [])]
        .filter(entry => entry.effectiveDate && new Date(entry.effectiveDate) <= periodEnd)
        .sort((a, b) => new Date(b.effectiveDate) - new Date(a.effectiveDate));

    const latest = history[0];
    if (latest) {
        return {
            basicSalary: toNumber(latest.basicSalary),
            visaBase: toNumber(latest.visaBase || latest.basicSalary),
            workBase: toNumber(latest.workBase || latest.basicSalary),
            ctc: toNumber(latest.ctc || latest.workBase || latest.basicSalary)
        };
    }

    return {
        basicSalary: toNumber(employee.basicSalary),
        visaBase: toNumber(employee.visaBase || employee.basicSalary),
        workBase: toNumber(employee.workBase || employee.basicSalary),
        ctc: toNumber(employee.ctc || employee.workBase || employee.basicSalary)
    };
};

const isEmployeeOnProbation = (employee, dateStr) => {
    if (!employee?.probationEndDate) return false;
    if (employee.probationStatus === "CONFIRMED") return false;
    const checkDate = new Date(dateStr);
    return checkDate <= new Date(employee.probationEndDate);
};

const resolveLeaveDayStatus = (employee, leaveInfo, dateStr, leaveRules = {}, sickLeaveConfig = {}) => {
    if (!leaveInfo) return null;

    if (isEmployeeOnProbation(employee, dateStr)) {
        return "UNPAID_LEAVE";
    }

    const typeName = leaveInfo.leaveType;
    const normalizedType = String(typeName || "").toLowerCase();
    const currentDate = new Date(dateStr);

    if (normalizedType.includes("sick")) {
        // Configurable via the Sick Leave master's metadata (Masters > HR Management >
        // Leave Types), falling back to the previously-hardcoded values if unset.
        const paidThresholdDays = Number(sickLeaveConfig.paidThresholdDays) || 15;
        const halfPaidThresholdDays = Number(sickLeaveConfig.halfPaidThresholdDays) || 45;
        const medicalDocRequiredAfterDays = Number(sickLeaveConfig.medicalDocRequiredAfterDays);
        const docThreshold = Number.isFinite(medicalDocRequiredAfterDays) ? medicalDocRequiredAfterDays : 1;

        // `rawDayIndex` is this day's position within THIS leave request. `dayIndex` adds
        // in every sick day already used earlier in the same calendar year (see
        // getApprovedLeavesMap's priorSickDaysThisYear) so the pay tiers are cumulative
        // per year, not reset every time a new sick leave is submitted.
        const rawDayIndex = Math.floor((currentDate - new Date(leaveInfo.start)) / (1000 * 60 * 60 * 24)) + 1;
        const dayIndex = (leaveInfo.priorSickDaysThisYear || 0) + rawDayIndex;
        const totalDays = Number(leaveInfo.numberOfDays || rawDayIndex || 1);

        if (!leaveInfo.hasMedicalDocument && totalDays > docThreshold && rawDayIndex > docThreshold) {
            return "UNPAID_LEAVE";
        }

        if (dayIndex <= paidThresholdDays) return "PAID_LEAVE";
        if (dayIndex <= halfPaidThresholdDays) return "HALF_PAID_LEAVE";
        return "UNPAID_LEAVE";
    }

    let isPaid = true;
    if (leaveInfo.isPaid !== undefined) isPaid = leaveInfo.isPaid;
    else if (typeName) {
        if (leaveRules[typeName] !== undefined) isPaid = leaveRules[typeName];
        else if (normalizedType.includes("unpaid")) isPaid = false;
    }

    return isPaid ? "PAID_LEAVE" : "UNPAID_LEAVE";
};

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
                    leaveType: details.leaveType || details.leaveTypeId || "Unpaid Leave",
                    numberOfDays: details.numberOfDays || 1,
                    isPaid: details.isPaid,
                    hasMedicalDocument: details.hasMedicalDocument,
                    leavePayStatus: details.leavePayStatus || "FULLY_PAID"
                });
            }
        }
    });

    // Sick leave pay tiers are cumulative per calendar year (not reset per request) -
    // for each employee's sick-leave ranges, stamp how many sick days they'd already
    // used earlier in that same calendar year, so resolveLeaveDayStatus can offset its
    // day-index instead of starting fresh at day 1 for every separate request.
    Object.values(map).forEach(ranges => {
        const sickRanges = ranges
            .filter(r => String(r.leaveType || "").toLowerCase().includes("sick"))
            .sort((a, b) => a.start - b.start);
        const usedByYear = {};
        sickRanges.forEach(r => {
            const year = r.start.getFullYear();
            r.priorSickDaysThisYear = usedByYear[year] || 0;
            usedByYear[year] = (usedByYear[year] || 0) + Number(r.numberOfDays || 1);
        });
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
const getAttendanceStats = async (employee, periodStart, periodEnd, preFetchedSettings = null, shiftMap = {}, debugInfo = null, leaveMap = {}, leaveRules = {}, sickLeaveConfig = {}) => {
    const employeeId = employee._id;
    // 1. Setup Date Range — periodStart/periodEnd are the actual pay-period
    // boundaries (rolling window, not necessarily a calendar month).
    const rangeStart = toDayStart(periodStart);
    const rangeEnd = toDayEnd(periodEnd);
    // Day-count MUST diff two day-starts (not day-start to day-end, which rounds
    // up an extra day) — this count drives the loop below, so an off-by-one here
    // silently pulls in one real day past the period boundary.
    const totalDaysInPeriod = Math.round((toDayStart(periodEnd) - rangeStart) / 86400000) + 1;
    const startStr = formatYMD(rangeStart);
    const endStr = formatYMD(rangeEnd);

    // 2. Fetch Data Sources
    const logs = await Attendance.find({
        employee: employeeId,
        date: { $gte: startStr, $lte: endStr }
    });
    const logMap = {};
    logs.forEach(l => logMap[l.date] = l);

    const settings = preFetchedSettings || await SystemSettings.findOne();
    const holidaySet = holidaySetFromHolidays(settings?.holidays || []);
    const workingDayDefault = { workingDayType: settings?.defaultWorkingDayType, weekOffDays: settings?.defaultWeekOffDays };

    // --- PHASE 1: BUILD DAY-BY-DAY STATUS ARRAY ---
    const dayStatuses = []; // Index 0 = first day of period
    const GLOBAL_STANDARD_HOURS = 9;

    // Helper to get hours for a specific shift name
    const getShiftHours = (shiftName) => {
        if (!shiftName || !shiftMap[shiftName]) return GLOBAL_STANDARD_HOURS;
        return Number(shiftMap[shiftName].workHours) || GLOBAL_STANDARD_HOURS;
    };

    let totalOvertimeHours = 0;

    for (let i = 0; i < totalDaysInPeriod; i++) {
        const day = i + 1;
        const dateObj = addDays(rangeStart, i);
        const dateStr = formatYMD(dateObj);
        const isEmployeeWeekOff = isWeekOff(dateObj, employee, workingDayDefault);

        let status = 'UNKNOWN'; // PRESENT, LATE, ABSENT, HOLIDAY, WEEKEND, PAID_LEAVE, HALF_PAID_LEAVE, UNPAID_LEAVE
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
                const mappedLeaveInfo = getLeaveInfo(employeeId, dateStr, leaveMap);
                if (mappedLeaveInfo) {
                    status = resolveLeaveDayStatus(employee, mappedLeaveInfo, dateStr, leaveRules, sickLeaveConfig);
                } else if (record.leavePayStatus === "HALF_PAID") status = 'HALF_PAID_LEAVE';
                else if (record.isPaid === false || record.leavePayStatus === "UNPAID") status = 'UNPAID_LEAVE';
                else status = 'PAID_LEAVE';
            } else {
                status = 'ABSENT';
            }
        }

        // B. Check Approved Leave (Override if no present record)
        if (status === 'UNKNOWN' || status === 'ABSENT') {
            const leaveInfo = getLeaveInfo(employeeId, dateStr, leaveMap);
            if (leaveInfo) {
                status = resolveLeaveDayStatus(employee, leaveInfo, dateStr, leaveRules, sickLeaveConfig);
            }
        }

        // C. Fallbacks (Holiday/Weekend/Absent) — Holiday takes precedence over Weekend
        // so a company holiday landing on someone's off-day still reads as "Holiday".
        if (status === 'UNKNOWN') {
            if (holidaySet.has(dateStr)) status = 'HOLIDAY';
            else if (isEmployeeWeekOff) status = 'WEEKEND';
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

    const hasAnyWorkedOrApprovedDay = dayStatuses.some((item) =>
        ["PRESENT", "PAID_LEAVE", "HALF_PAID_LEAVE"].includes(item.status)
    );

    // --- PHASE 2: APPLY SANDWICH RULE ---
    // Rule: If (ABSENT) -> [WEEKEND/HOLIDAY] -> (ABSENT), then [WEEKEND/HOLIDAY] becomes (UNPAID_LEAVE/SANDWICH)

    // Helper to get status for any date (including outside current month)
    const getStatusForDate = (dObj) => {
        const y = dObj.getFullYear();
        const m = String(dObj.getMonth() + 1).padStart(2, '0');
        const d = String(dObj.getDate()).padStart(2, '0');
        const dStr = `${y}-${m}-${d}`;

        // 1. Check Log
        if (logMap[dStr]) {
            const r = logMap[dStr];
            if (r.status === 'Present' || r.status === 'Late') return 'PRESENT';
            if (r.status === 'On Leave') {
                const mappedLeaveInfo = getLeaveInfo(employeeId, dStr, leaveMap);
                if (mappedLeaveInfo) {
                    return resolveLeaveDayStatus(employee, mappedLeaveInfo, dStr, leaveRules, sickLeaveConfig);
                }
                if (r.leavePayStatus === "HALF_PAID") return 'HALF_PAID_LEAVE';
                return r.isPaid === false ? 'UNPAID_LEAVE' : 'PAID_LEAVE';
            }
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
            return resolveLeaveDayStatus(employee, leaveInfo, dStr, leaveRules, sickLeaveConfig);
        }

        // 3. Fallback — Holiday takes precedence over Weekend (same reasoning as the
        // main loop above). Reuses the same `holidaySet` built once per getAttendanceStats
        // call instead of re-scanning `settings.holidays` a third time — `dStr` here is
        // computed with local getters same as `formatYMD` produces, so the keys line up.
        if (holidaySet.has(dStr)) return 'HOLIDAY';
        if (isWeekOff(dObj, employee, workingDayDefault)) return 'WEEKEND';

        return 'ABSENT'; // Default fallback if no logs/rules
    };

    const isAbsentOrLOP = (s) => s === 'ABSENT' || s === 'UNPAID_LEAVE' || s === 'SANDWICH_LEAVE';
    const isGap = (s) => s === 'WEEKEND' || s === 'HOLIDAY';

    if (hasAnyWorkedOrApprovedDay) {
        console.log(`[DEBUG] Employee ${employeeId} (${startStr} to ${endStr}) - Starting Sandwich Check (With Boundary Scan)`);

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
                    // BOUNDARY CHECK: Scan backwards from the day before this period starts
                    let backDate = addDays(rangeStart, -1);

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
                    // BOUNDARY CHECK: Scan forwards from the day after this period ends
                    let fwdDate = addDays(rangeEnd, 1);

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
    }

    // Working Day Type 2 = a flexible monthly allowance (any 2 days, no fixed
    // weekday, no leave request needed) rather than a structural per-day weekend -
    // isWeekOff() above deliberately never marks a day off for this type, so any
    // day that has no record and isn't leave/holiday still resolved to plain ABSENT
    // in the loop. Convert the employee's first `quotaDays` such days per period
    // into FLEX_OFF (paid, not deducted) now, before Phase 3 tallies them.
    if (employee.workingDayType === 2) {
        applyMonthlyFlexQuota(dayStatuses, 2);
    }

    // --- PHASE 3: CALCULATE METRICS ---
    let paidDays = 0;
    let lopDays = 0;
    let lateCount = 0;
    let lateTier1 = 0, lateTier2 = 0, lateTier3 = 0;
    let unpaidLeavesCount = 0;
    let paidLeavesCount = 0;
    let halfPaidLeavesCount = 0;

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
            case 'HALF_PAID_LEAVE':
                paidDays += 0.5;
                halfPaidLeavesCount++;
                break;
            case 'WEEKEND':
            case 'HOLIDAY':
            case 'FLEX_OFF':
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
        totalDays: totalDaysInPeriod,
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
        daysAbsent: lopDays,
        unpaidLeaves: unpaidLeavesCount,
        paidLeaves: paidLeavesCount,
        halfPaidLeaves: halfPaidLeavesCount,
        overtimeHours: parseFloat(totalOvertimeHours.toFixed(2)),
        late: lateCount,
        lateTier1,
        lateTier2,
        lateTier3
    };
};

export const validatePayrollGeneration = async (req, res) => {
    try {
        const { month, year } = req.query;
        if (!month || !year) {
            return res.status(400).json({ message: "Month and year are required" });
        }

        const employees = await Employee.find({ status: "Active" }).select("_id name code department");
        const daysInMonth = new Date(Number(year), Number(month), 0).getDate();
        const strMonth = String(month).padStart(2, "0");
        const startStr = `${year}-${strMonth}-01`;
        const endStr = `${year}-${strMonth}-${daysInMonth}`;

        const warnings = [];

        for (const employee of employees) {
            const attendanceCount = await Attendance.countDocuments({
                employee: employee._id,
                date: { $gte: startStr, $lte: endStr }
            });

            if (attendanceCount === 0) {
                warnings.push({
                    employeeId: employee._id,
                    name: employee.name,
                    code: employee.code,
                    department: employee.department,
                    type: "ZERO_ATTENDANCE",
                    message: `${employee.name} has zero attendance records for ${strMonth}/${year}.`
                });
            }
        }

        res.json({
            success: true,
            warnings
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to validate payroll generation" });
    }
};

// --- API: Latest Finalized Payroll Period ---
// Used by the period picker to lock out any month/year at or before the last
// finalized cycle. Derived from the audit trail so it moves with whenever
// finalize actually happens, instead of a fixed day-of-month cutoff.
export const getLatestFinalizedPeriod = async (req, res) => {
    try {
        const latest = await getLatestFinalizedCycle();
        res.json({ success: true, latestFinalized: latest });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch latest finalized payroll period" });
    }
};

// --- API: Set Payroll Period Anchor ---
// Admin-only correction tool (Masters > System Settings), separate from Finalize/
// Un-finalize. Moves the rolling-period lockout cursor to a chosen date WITHOUT
// creating, editing, or touching any real Payroll/employee data — purely records
// a marker so the next generate's "From" locks to (anchorDate + 1 day). Used to
// set up or correct where the date-range payroll system starts counting from.
export const setPayrollAnchor = async (req, res) => {
    try {
        const { anchorDate: anchorDateRaw, force } = req.body;

        if (!anchorDateRaw) {
            return res.status(400).json({ message: "anchorDate is required." });
        }

        const anchorPeriodEnd = toDayEnd(anchorDateRaw);
        const month = anchorPeriodEnd.getMonth() + 1;
        const year = anchorPeriodEnd.getFullYear();

        // Safety check: setting the anchor to a date that falls at/before an
        // already-PROCESSED period's end risks a future generate double-counting
        // those days (they were already paid under whatever recorded that period).
        // Moving the anchor FORWARD (skipping a gap) is always safe; moving it
        // BACKWARD into already-paid territory needs an explicit override.
        const conflicting = await Payroll.find({
            status: { $in: ["PROCESSED", "PAID"] },
            periodEnd: { $gt: anchorPeriodEnd }
        }).select("employee periodStart periodEnd").limit(1);

        if (conflicting.length > 0 && !force) {
            const conflict = conflicting[0];
            return res.status(409).json({
                message: `This date is before an already-finalized period ending ${formatYMD(conflict.periodEnd)}. `
                    + `Setting the anchor here risks double-counting those days if you later generate payroll for them. `
                    + `Pass force to override if this is intentional.`,
                conflictPeriodEnd: formatYMD(conflict.periodEnd)
            });
        }

        await PayrollAudit.create({
            action: "ANCHOR_SET",
            performedBy: req.user ? req.user._id : null,
            performedByName: req.user ? req.user.name : "System",
            month,
            year,
            periodEnd: anchorPeriodEnd,
            details: `Payroll period anchor set to ${formatYMD(anchorPeriodEnd)} (next period starts ${formatYMD(addDays(anchorPeriodEnd, 1))})${conflicting.length ? " — overrode an existing-finalized-period conflict" : ""}`
        });

        logActivity({
            req,
            action: "UPDATE",
            module: "SETTINGS",
            description: `Payroll period anchor set to ${formatYMD(anchorPeriodEnd)}`,
            targetName: "Payroll Period Anchor"
        }).catch(() => {});

        res.json({
            success: true,
            message: `Anchor set. Next payroll period will start ${formatYMD(addDays(anchorPeriodEnd, 1))}.`,
            anchorPeriodEnd: formatYMD(anchorPeriodEnd)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- API: Generate Payroll for a Month ---
export const generatePayroll = async (req, res) => {
    try {
        const { periodStart: periodStartRaw, periodEnd: periodEndRaw, force } = req.body;

        if (!periodStartRaw || !periodEndRaw) {
            return res.status(400).json({ message: "periodStart and periodEnd are required." });
        }

        const periodStart = toDayStart(periodStartRaw);
        const periodEnd = toDayEnd(periodEndRaw);

        if (periodEnd < periodStart) {
            return res.status(400).json({ message: "periodEnd cannot be before periodStart." });
        }

        // Block (re)generating a period that's already been finalized, or anything
        // before it — once finalized, that period and every earlier one is locked.
        const latestFinalized = await getLatestFinalizedCycle();
        if (latestFinalized && periodEnd <= latestFinalized.periodEnd) {
            return res.status(400).json({
                message: `Payroll through ${formatYMD(latestFinalized.periodEnd)} is already finalized and locked. Select a later period.`
            });
        }

        // The contiguity check above only guards against the LATEST FINALIZED cycle -
        // a DRAFT that never got finalized (admin generated it, then generated a later
        // period instead of finalizing first) was invisible to it, so nothing stopped
        // requesting a period that fully overlaps an existing DRAFT/PROCESSED/PAID one.
        // That produced payroll runs spanning the union of both ranges (e.g. periodStart
        // reused from the stale draft + a much later periodEnd), inflating attendanceSummary
        // totalDays to an impossible figure and double-counting the overlapping days'
        // attendance/deductions. Any existing record whose range intersects the requested
        // one - regardless of status - means this isn't a fresh period.
        // EXCLUDE an exact periodStart+periodEnd match though - re-running generation for
        // the SAME period (e.g. to refresh numbers after fixing attendance data) is the
        // normal, intended path: the bulkWrite below upserts on this exact triple
        // (employee, periodStart, periodEnd), so it updates the existing docs in place
        // rather than creating a duplicate. Flagging that as a conflict would block routine
        // re-generation, not just genuine overlaps.
        const overlapping = await Payroll.findOne({
            periodStart: { $lte: periodEnd },
            periodEnd: { $gte: periodStart },
            $nor: [{ periodStart, periodEnd }]
        }).select("periodStart periodEnd status employee");

        if (overlapping && !force) {
            return res.status(409).json({
                message: `Requested period (${formatYMD(periodStart)} to ${formatYMD(periodEnd)}) overlaps an existing ${overlapping.status} payroll period `
                    + `(${formatYMD(overlapping.periodStart)} to ${formatYMD(overlapping.periodEnd)}). Finalize or delete the conflicting period first, `
                    + `or pass force to override if this is intentional.`,
                conflictPeriodStart: formatYMD(overlapping.periodStart),
                conflictPeriodEnd: formatYMD(overlapping.periodEnd),
                conflictStatus: overlapping.status
            });
        }

        // Force-contiguous: the new period must start the day right after the last
        // finalized period ended — no gaps (missed pay days), no overlaps (double-paid
        // days). First-ever cycle has no prior finalized period, so any start is fine.
        if (latestFinalized) {
            const requiredStart = toDayStart(addDays(latestFinalized.periodEnd, 1));
            if (periodStart.getTime() !== requiredStart.getTime()) {
                return res.status(400).json({
                    message: `Period must start ${formatYMD(requiredStart)} (the day after the last finalized period ended) to stay contiguous.`
                });
            }
        }

        // month/year are derived from periodEnd — used only for backward-compat
        // bucketing in reports/exports/loan-deduction scheduling, not as the period identity.
        const month = periodEnd.getMonth() + 1;
        const year = periodEnd.getFullYear();

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

        // Sick Leave pay tiers, configurable via Masters > HR Management > Leave Types
        // (see resolveLeaveDayStatus) - falls back to the historical hardcoded values
        // if the Sick Leave master hasn't been configured with these fields yet.
        const sickLeaveMaster = masterLeaveTypes.find(t => String(t.name || "").toLowerCase().includes("sick"));
        const sickLeaveConfig = {
            paidThresholdDays: sickLeaveMaster?.metadata?.paidThresholdDays,
            halfPaidThresholdDays: sickLeaveMaster?.metadata?.halfPaidThresholdDays,
            medicalDocRequiredAfterDays: sickLeaveMaster?.metadata?.medicalDocRequiredAfterDays
        };

        // ✅ NEW: Fetch Approved Leave Map
        const approvedLeaveMap = await getApprovedLeavesMap(employees);

        const settings = await SystemSettings.findOne();

        const payrollRecords = [];

        for (const emp of employees) {
            const effectiveSalary = resolveEffectiveSalary(emp, periodEnd);
            // Use basicSalary, not visaBase. An appraisal splits the increment 50/30/20
            // across basicSalary/hra/allowance but adds the FULL increment to visaBase.
            // Paying visaBase as "Basic" while also paying the split hra/allowance double-
            // counted the non-basic slice of every appraisal increment, inflating gross
            // (and the WPS/SIF filed basic). basicSalary matches the employee's salary
            // card and the gratuity calc. Fall back to visaBase only for legacy records
            // with no basicSalary set.
            const basicSalary = effectiveSalary.basicSalary || effectiveSalary.visaBase;

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
                emp, periodStart, periodEnd,
                settings, shiftMap,
                { code: emp.code },
                approvedLeaveMap,
                leaveRulesMap,
                sickLeaveConfig
            );

            if (stats.halfPaidLeaves > 0) {
                const halfPayDeduction = stats.halfPaidLeaves * (dailySalary / 2);
                deductionList.push({
                    name: "Sick Leave Half Pay Adjustment",
                    amount: parseFloat(halfPayDeduction.toFixed(2)),
                    type: "AUTO",
                    meta: `${stats.halfPaidLeaves} day(s) at half pay`
                });
                totalDeductions += halfPayDeduction;
            }

            // --- 2.2 FIXED EMPLOYEE ALLOWANCES ---
            // Accommodation/Vehicle Expense are CTC-only, never part of actual monthly
            // gross pay - see computeTotalSalary/computeCtc (salaryCalc.js), which
            // deliberately exclude them from Total Salary and only add them for the CTC
            // figure. Paying them out here as cash allowances contradicted that
            // convention (and the client's own expectation) - removed.
            const fixedAllowances = [
                { name: "Housing Rent Allowance (HRA)", value: emp.hra },
                { name: "Other Allowance", value: emp.allowance }
            ];

            fixedAllowances.forEach(fa => {
                const amount = Number(fa.value) || 0;
                if (amount > 0) {
                    allowanceList.push({
                        name: fa.name,
                        amount: amount,
                        type: "AUTO",
                        meta: "Fixed Monthly Allowance"
                    });
                    totalAllowances += amount;
                }
            });

            // Ad-hoc allowances added/increased via Appraisals > Add Allowance
            (emp.allowances || []).forEach(item => {
                // Respect the "Include in Payroll" toggle. Strict === false so that
                // pre-existing entries (field absent / undefined) still pass through —
                // no data migration required.
                if (item.includeInPayroll === false) return;
                const amount = Number(item.amount) || 0;
                if (amount > 0) {
                    allowanceList.push({
                        name: item.typeName,
                        amount: amount,
                        type: "AUTO",
                        meta: "Fixed Monthly Allowance"
                    });
                    totalAllowances += amount;
                }
            });

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

                    // --- CAP / ADJUSTMENT FOR ABSENT DAYS ---
                    // Issue: If Absent Days > 30 (e.g. 31), Deduction (31 * Basic/30) > Basic Salary.
                    // Fix: If Basis is ABSENT_DAYS, we should ensure deduction doesn't exceed 100% of applicable salary components?
                    // Simple Fix: For "LOP", if stats.daysPresent == 0, Deduction = Basic.
                    // Or Cap amount at Basic Salary?

                    if (basis === "ABSENT_DAYS") {
                        // If daysPresent is 0, employee should get 0 Basic. 
                        // So Deduction should exactly equal Basic (if no other components involved).
                        // Current logic: Basic - (Absent * Basic/30) = Net.
                        // If Absent=31, Net = -Basic/30.

                        // Strict Pro-rating for Full Month Absence?
                        if (stats.daysPresent === 0) {
                            // Full Month Absent
                            // Cap deduction at Basic Salary (to zero it out)
                            // NOTE: If we have allowances, they might also need LOP deduction separately!
                            // But usually allowances are paid if present? 
                            // Current rule engine only deducts from "Net Payable" essentially.

                            // Let's cap the Calculated LOP AMOUNT at the Basic Salary for now.
                            if (amount > basicSalary) {
                                amount = basicSalary;
                                description += " (Capped at Basic)";
                            }
                        } else {
                            // Partial presence.
                            // If we use 30-day fixed basis, we suffer from 31st day issue.
                            // Ideally, we should use `daysInMonth` for rate calculation?
                            // Standard UAE/Labor practice often uses 30 days regardless.
                            // But for deductions, usually: Pay = Basic * (WorkedDays / 30).
                            // If WorkedDays < 0 ?? No.
                            // Correct formula: Pay = Basic - (Absent * Basic/30).

                            // If Absent=31? Pay = 20000 - 20666 = -666.
                            // We should Cap Deduction at Basic Salary always.
                            if (amount > basicSalary) {
                                amount = basicSalary;
                            }
                        }
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
                    const startMonth = Number(req.details?.deductionStartMonth) || Number(month);
                    const startYear = Number(req.details?.deductionStartYear) || Number(year);
                    const currentCycleKey = getPayrollCycleKey(month, year);
                    const startCycleKey = getPayrollCycleKey(startMonth, startYear);

                    if (currentCycleKey < startCycleKey) {
                        continue;
                    }

                    if (hasScheduledSkip(req.details, month, year)) {
                        continue;
                    }

                    const alreadyDeductedThisCycle = Array.isArray(req.payrollDeductions) && req.payrollDeductions.some((entry) =>
                        Number(entry.month) === Number(month) && Number(entry.year) === Number(year)
                    );

                    if (alreadyDeductedThisCycle) {
                        continue;
                    }

                    // Logic: Deduction Amount
                    let deductionAmount = 0;
                    const alreadyPaid = req.payrollDeductions ? req.payrollDeductions.reduce((sum, d) => sum + d.amount, 0) : 0;
                    const remaining = totalPayable - alreadyPaid;

                    if (remaining <= 0) continue; // Should be handled by isFullyPaid, but safety check

                    if (req.details?.subType === "salary_advance") {
                        // Assumption: One-time deduction unless period > 1 specified
                        if (period > 1) {
                            const installment = totalPayable / period;
                            deductionAmount = Math.min(installment, remaining);
                        } else {
                            deductionAmount = remaining; // Full deduction
                        }
                    } else if (req.details?.subType === "loan") {
                        // Prefer the monthly repayment amount fixed at approval time; fall back to
                        // totalPayable/period division for loans approved before that field existed.
                        const monthlyRepaymentAmount = Number(req.details?.monthlyRepaymentAmount) || 0;
                        const installment = monthlyRepaymentAmount > 0 ? monthlyRepaymentAmount : (totalPayable / period);
                        deductionAmount = Math.min(installment, remaining);
                    }

                    // Check if this specific month/year was already deducted (idempotency for re-runs)
                    // We don't save to Request yet (that's finalize), so we just add to current payroll draft.
                    // But if we already Finalized a payroll for this month, generatePayroll shouldn't define it again?
                    // generatePayroll creates DRAFT. If previous finalized payroll exists for this month, user handles it.

                    if (deductionAmount > 0) {
                        deductionList.push({
                            name: req.details?.subType === 'loan' ? `Loan Repayment (${req.requestId})` : `Salary Advance (${req.requestId})`,
                            amount: parseFloat(deductionAmount.toFixed(2)),
                            type: "AUTO",
                            meta: `Req ID: ${req.requestId} | Remaining: ${parseFloat((remaining - deductionAmount).toFixed(2))}`
                        });
                        totalDeductions += deductionAmount;
                    }
                }
            }

            // 4. Calculate Net — totals are the exact sum of the (already 2dp-rounded)
            // line items so the payslip's Total Allowances / Total Deductions always
            // equal the sum of the rows displayed, and net never carries float-rounding
            // residue. (Was: totalAllowances/totalDeductions accumulated raw floats.)
            const roundedBasic = round2(basicSalary);
            const finalAllowances = sumAmounts(allowanceList);
            const finalDeductions = sumAmounts(deductionList);
            const netSalary = round2(roundedBasic + finalAllowances - finalDeductions);

            // 5. Prepare Record — identity is the exact period (employee + periodStart +
            // periodEnd), not derived month/year, so regenerating the same period
            // updates the same draft instead of creating a duplicate.
            payrollRecords.push({
                updateOne: {
                    filter: { employee: emp._id, periodStart, periodEnd },
                    update: {
                        $set: {
                            month,
                            year,
                            status: "DRAFT",
                            basicSalary: roundedBasic,
                            allowances: allowanceList,
                            deductions: deductionList,
                            totalAllowances: finalAllowances,
                            totalDeductions: finalDeductions,
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
                periodStart,
                periodEnd,
                details: `Generated payroll for ${payrollRecords.length} employees (${formatYMD(periodStart)} to ${formatYMD(periodEnd)})`,
                totalEmployees: payrollRecords.length
            });
        }

        res.status(200).json({
            message: `Payroll Generated for ${employees.length} employees`,
            month,
            year,
            periodStart,
            periodEnd
        });

    } catch (error) {
        // console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// --- API: Get Payroll Summary ---
export const getPayrollSummary = async (req, res) => {

    try {
        const { month, year, company, branch, visaCompany, workPermitCompany, search, reportType, page = 1, limit = 50 } = req.query;

        // ✅ Native Backend Filtering (Database Level)
        let employeeMatch = {};
        if (reportType === 'permit') {
            employeeMatch = { workPermitCompany: { $ne: null, $exists: true } };
        } else if (reportType === 'visa') {
            employeeMatch = { visaCompany: { $ne: null, $exists: true } };
        }

        // 1. Fetch payroll records for month/year with native employee match
        let records = await Payroll.find({ month, year })
            .populate({
                path: "employee",
                select: "name code department designation role company branch basicSalary visaBase workBase ctc salaryHistory visaCompany workPermitCompany",
                match: employeeMatch
            })
            .populate("allowances.addedBy", "name")
            .populate("deductions.addedBy", "name");

        // Filter out records where employee didn't match the criteria (for populated nulls)
        records = records.filter(r => r.employee !== null);

        // 2. Filter by company
        if (company) {
            records = records.filter(r => r.employee?.company === company);
        }

        // 3. Filter by branch
        if (branch) {
            records = records.filter(r => r.employee?.branch === branch);
        }

        // 3b. Filter by visaCompany
        if (visaCompany) {
            records = records.filter(r => r.employee?.visaCompany === visaCompany);
        }

        // 3c. Filter by workPermitCompany (Location)
        if (workPermitCompany) {
            records = records.filter(r => r.employee?.workPermitCompany === workPermitCompany);
        }

        // 4. Filter by search (name or code)
        if (search) {
            const q = search.toLowerCase();
            records = records.filter(r =>
                r.employee?.name?.toLowerCase().includes(q) ||
                r.employee?.code?.toLowerCase().includes(q)
            );
        }

        // 5. Stats (before pagination)
        let totalNet = 0, totalBasic = 0, totalAllowances = 0, totalDeductions = 0;
        records.forEach(r => {
            totalNet += r.netSalary || 0;
            totalBasic += r.basicSalary || 0;
            totalAllowances += r.totalAllowances || 0;
            totalDeductions += r.totalDeductions || 0;
        });

        // 6. Pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const totalRecords = records.length;
        const totalPages = Math.ceil(totalRecords / limitNum);
        const paginatedRecords = records.slice((pageNum - 1) * limitNum, pageNum * limitNum);

        res.status(200).json({
            records: paginatedRecords,
            stats: {
                count: totalRecords,
                totalBasic,
                totalAllowances,
                totalDeductions,
                totalNet
            },
            pagination: {
                current: pageNum,
                limit: limitNum,
                totalRecords,
                totalPages
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

// Loan/advance line items carry meta: "Req ID: REQxxx | Remaining: ..." so
// finalizePayroll/unfinalizePayroll can find their way back to the Request doc.
// If HR deletes an AUTO-generated loan/advance line and manually re-adds it (e.g.
// to override one month's amount), the replacement had no meta - finalizePayroll's
// writeback silently skipped it, so the employee got paid correctly but the loan's
// Request.payrollDeductions ledger never moved. Re-derive the same marker here so a
// manual override of a loan/advance line stays traceable exactly like the original.
const LOAN_NAME_PATTERN = /^(Loan Repayment|Salary Advance)\s*\(([A-Za-z0-9]+)\)/i;

// --- API: Add Manual Adjustment ---
export const addAdjustment = async (req, res) => {
    try {
        // type: "ALLOWANCE" | "DEDUCTION" | "OVERTIME" (overtime is a structured
        // allowance variant - see isOvertime below)
        const { payrollId, type, name, amount, reason, hours, rate } = req.body;
        const payroll = await Payroll.findById(payrollId);

        if (!payroll) return res.status(404).json({ message: "Payroll record not found" });
        if (payroll.status !== "DRAFT") return res.status(400).json({ message: "Cannot adjust a finalized payroll." });

        // ✅ Enforce Mandatory Reason
        if (!reason || reason.trim() === "") {
            return res.status(400).json({ message: "Reason is required for manual adjustments." });
        }

        // Overtime: hours x rate, when given, is the source of truth for the amount
        // (rather than trusting a client-computed `amount`) - keeps the structured
        // hours/rate meta and the paid amount always consistent.
        const isOvertime = type === "OVERTIME";
        const numHours = isOvertime ? Number(hours) || 0 : null;
        const numRate = isOvertime ? Number(rate) || 0 : null;
        const numAmount = isOvertime && numHours && numRate
            ? round2(numHours * numRate)
            : round2(Number(amount));

        const newItem = {
            name: name || (isOvertime ? "Overtime" : name),
            amount: numAmount,
            type: "MANUAL",
            // ✅ Manual Tracking
            addedBy: req.user._id,
            addedAt: new Date(),
            reason: reason
        };

        if (isOvertime) {
            newItem.category = "OVERTIME";
            newItem.meta = { hours: numHours, rate: numRate };
        } else if (type === "DEDUCTION") {
            const loanMatch = String(name || "").match(LOAN_NAME_PATTERN);
            if (loanMatch) newItem.meta = `Req ID: ${loanMatch[2]}`;
        }

        if (type === "ALLOWANCE" || isOvertime) {
            payroll.allowances.push(newItem);
        } else {
            payroll.deductions.push(newItem);
        }

        // Recompute totals + net from the line items (not incrementally) so the totals
        // always equal the exact sum of the rows shown - see round2 note above.
        payroll.totalAllowances = sumAmounts(payroll.allowances);
        payroll.totalDeductions = sumAmounts(payroll.deductions);
        payroll.netSalary = round2(round2(payroll.basicSalary) + payroll.totalAllowances - payroll.totalDeductions);

        await payroll.save();

        // AUDIT LOG
        await PayrollAudit.create({
            action: "ADJUSTMENT",
            performedBy: req.user ? req.user._id : null,
            performedByName: req.user ? req.user.name : "System",
            month: payroll.month,
            year: payroll.year,
            details: `Manual adjustment [${type}]: ${newItem.name} (${numAmount}) for Payroll ID ${payrollId}`,
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
            }
        } else {
            const itemIndex = payroll.deductions.findIndex(i => i._id.toString() === itemId);
            if (itemIndex > -1) {
                removedAmount = payroll.deductions[itemIndex].amount;
                removedName = payroll.deductions[itemIndex].name;
                payroll.deductions.splice(itemIndex, 1);
            }
        }

        // Recompute totals + net from the remaining line items (not by subtracting the
        // removed amount from a raw-float running total) - see round2 note above.
        payroll.totalAllowances = sumAmounts(payroll.allowances);
        payroll.totalDeductions = sumAmounts(payroll.deductions);
        payroll.netSalary = round2(round2(payroll.basicSalary) + payroll.totalAllowances - payroll.totalDeductions);
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

// --- API: Remove an employee's whole record from a DRAFT payroll period ---
// Distinct from removePayrollItem above (which deletes one allowance/deduction line).
// The row-menu "Remove" action used to call removePayrollItem with only a payrollId
// (no itemId/type) - that's a no-op that still returned 200, so the row never
// actually disappeared. This is the real endpoint: deletes the whole Payroll doc for
// that employee+period. DRAFT-only, same lock as addAdjustment/removePayrollItem -
// once PROCESSED, Un-finalize first.
export const removeEmployeeFromPayroll = async (req, res) => {
    try {
        const { payrollId } = req.body;
        const payroll = await Payroll.findById(payrollId).populate("employee", "name code");

        if (!payroll) return res.status(404).json({ message: "Payroll record not found" });
        if (payroll.status !== "DRAFT") {
            return res.status(400).json({ message: "Cannot remove an employee from a finalized payroll. Un-finalize the period first." });
        }

        const { month, year, employee } = payroll;
        await Payroll.deleteOne({ _id: payrollId });

        await PayrollAudit.create({
            action: "REMOVED_FROM_PAYROLL",
            performedBy: req.user ? req.user._id : null,
            performedByName: req.user ? req.user.name : "System",
            month: String(month),
            year: String(year),
            details: `Removed ${employee?.name || "employee"} (${employee?.code || payrollId}) from payroll`,
            relatedPayrollId: payrollId
        });

        res.json({ message: "Employee removed from payroll" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- API: Finalize Payroll ---
export const finalizePayroll = async (req, res) => {
    try {
        const { periodStart: periodStartRaw, periodEnd: periodEndRaw } = req.body;

        if (!periodStartRaw || !periodEndRaw) {
            return res.status(400).json({ message: "periodStart and periodEnd are required." });
        }

        const periodStart = toDayStart(periodStartRaw);
        const periodEnd = toDayEnd(periodEndRaw);
        const month = periodEnd.getMonth() + 1;
        const year = periodEnd.getFullYear();

        // 1. Fetch DRAFT records to process — identity is the exact period, matching
        // how generatePayroll stores it (not derived month/year).
        const records = await Payroll.find({ periodStart, periodEnd, status: "DRAFT" });

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
            periodStart,
            periodEnd,
            details: `Finalized payroll for ${records.length} records (${formatYMD(periodStart)} to ${formatYMD(periodEnd)})`
        });

        logActivity({
            req,
            action: "APPROVE",
            module: "PAYROLL",
            description: `Payroll finalized for ${month}/${year} — ${records.length} employees`,
            targetName: `Payroll ${month}/${year}`
        }).catch(() => {});

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- API: Un-finalize Payroll (undo a mistaken Finalize) ---
// Only the MOST RECENTLY finalized period can be reverted — undoing an older one
// while a later one stays locked would desync the force-contiguous chain (the
// lockout always looks at the furthest periodEnd across all FINALIZED audit
// entries, so reverting a non-latest period wouldn't actually reopen anything).
export const unfinalizePayroll = async (req, res) => {
    try {
        const { periodStart: periodStartRaw, periodEnd: periodEndRaw } = req.body;

        if (!periodStartRaw || !periodEndRaw) {
            return res.status(400).json({ message: "periodStart and periodEnd are required." });
        }

        const periodStart = toDayStart(periodStartRaw);
        const periodEnd = toDayEnd(periodEndRaw);
        const month = periodEnd.getMonth() + 1;
        const year = periodEnd.getFullYear();

        const latestFinalized = await getLatestFinalizedCycle();
        if (!latestFinalized || latestFinalized.periodEnd.getTime() !== periodEnd.getTime()) {
            return res.status(400).json({
                message: latestFinalized
                    ? `Only the most recently finalized period (through ${formatYMD(latestFinalized.periodEnd)}) can be un-finalized.`
                    : "No finalized payroll period exists to un-finalize."
            });
        }

        const records = await Payroll.find({ periodStart, periodEnd, status: "PROCESSED" });
        if (records.length === 0) {
            return res.status(400).json({ message: "No finalized (PROCESSED) payroll records found for this exact period." });
        }

        // Reverse any loan/advance deductions this finalize applied — exact inverse
        // of the bookkeeping finalizePayroll performed.
        for (const p of records) {
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
                        const idx = request.payrollDeductions.findIndex((pd) => pd.month == month && pd.year == year);
                        if (idx > -1) {
                            request.payrollDeductions.splice(idx, 1);

                            const totalPaid = request.payrollDeductions.reduce((sum, x) => sum + x.amount, 0);
                            if (totalPaid < (request.details.amount - 1)) {
                                request.isFullyPaid = false;
                                // Only step back from COMPLETED if finalize is what set it —
                                // don't clobber some other terminal status for a different reason.
                                if (request.status === "COMPLETED") request.status = "APPROVED";
                            }

                            await request.save();
                        }
                    }
                }
            }
        }

        // Revert to DRAFT
        for (const p of records) {
            p.status = "DRAFT";
            await p.save();
        }

        // Remove the FINALIZED audit entry for this exact period so the lockout
        // correctly rolls back to whatever was finalized before it.
        await PayrollAudit.deleteMany({ action: "FINALIZED", periodStart, periodEnd });

        res.json({ message: `Un-finalized payroll for ${records.length} employees. The period is editable again.` });

        await PayrollAudit.create({
            action: "UNFINALIZED",
            performedBy: req.user ? req.user._id : null,
            performedByName: req.user ? req.user.name : "System",
            month,
            year,
            periodStart,
            periodEnd,
            details: `Un-finalized payroll for ${records.length} records (${formatYMD(periodStart)} to ${formatYMD(periodEnd)})`
        });

        logActivity({
            req,
            action: "UPDATE",
            module: "PAYROLL",
            description: `Payroll un-finalized for ${month}/${year} — ${records.length} employees`,
            targetName: `Payroll ${month}/${year}`
        }).catch(() => {});

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- API: Export Payroll to Excel ---
export const exportPayroll = async (req, res) => {
    try {
        const { month, year, reportType, visaCompany, workPermitCompany, company, branch } = req.query;

        // Populate fields needed for the report
        // ✅ ADDED: Specialized filtering for Work Permit / Visa reports
        let match = {};
        if (reportType === 'permit') {
            match = { workPermitCompany: { $ne: null, $exists: true } };
        } else if (reportType === 'visa') {
            match = { visaCompany: { $ne: null, $exists: true } };
        }

        let records = await Payroll.find({ month, year }).populate({
            path: "employee",
            select: "name code designation department company branch bankAccount iban bankName laborCardNumber personalId workPermitCompany visaCompany",
            match
        });

        // Filter out records where employee didn't match the specific report criteria
        records = records.filter(r => r.employee !== null);

        // ✅ Apply additional filters (company, branch, visaCompany, workPermitCompany)
        if (company) {
            records = records.filter(r => r.employee?.company === company);
        }
        if (branch) {
            records = records.filter(r => r.employee?.branch === branch);
        }
        if (visaCompany) {
            records = records.filter(r => r.employee?.visaCompany === visaCompany);
        }
        if (workPermitCompany) {
            records = records.filter(r => r.employee?.workPermitCompany === workPermitCompany);
        }

        if (!records || records.length === 0) {
            return res.status(404).json({ message: `No ${reportType || ''} payroll records found for this month.` });
        }

        // --- Prepare Data for Excel ---
        const monthNames = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
        const monthName = monthNames[parseInt(month) - 1] || "UNKNOWN";

        // Company Constants
        const exportCompanyName = records[0]?.employee?.company || process.env.COMPANY_NAME || "Company";
        const COMPANY_NAME = `COMPANY NAME: ${exportCompanyName}`;
        const MOL_ID = "MOL ID No. 0000001564503";

        // ✅ DYNAMIC TITLE based on report type
        let reportPrefix = "PAYROLL";
        if (reportType === 'permit') reportPrefix = "LOCATION REPORT";
        if (reportType === 'visa') reportPrefix = "VISA REPORT";

        const REPORT_TITLE = `${reportPrefix} FOR THE MONTH OF ${monthName} - ${year}`;

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
        const { month, year, periodStart, periodEnd } = req.query;
        // Prefer the exact period (periodStart/periodEnd) over the derived month/year
        // pair when the caller has it. month/year is a calendar-month bucket computed
        // independently by the frontend from whatever periodEnd the date picker
        // currently shows - Finalize/Un-finalize/the "Finalized" badge all key off the
        // *exact* period instead, so the two can drift out of sync (e.g. the picker
        // re-renders with a different periodEnd than the one that's actually marked
        // Finalized) and this endpoint would search the wrong bucket and wrongly
        // report "no finalized records" for a period that IS finalized.
        const query = { status: "PROCESSED" };
        if (periodStart && periodEnd) {
            // Must normalize with the same toDayStart/toDayEnd helper generatePayroll
            // used to store these - a raw `new Date(periodStart)` lands on UTC midnight,
            // which is NOT what's stored (periodStart/periodEnd are local-midnight
            // normalized, so their UTC millisecond value shifts by the server's
            // timezone offset - a naive Date parse here would never exact-match).
            query.periodStart = toDayStart(periodStart);
            query.periodEnd = toDayEnd(periodEnd);
        } else {
            query.month = month;
            query.year = year;
        }
        // A bank payment file should only ever be built from finalized payroll -
        // was pulling DRAFT records too, contrary to this comment's own stated intent.
        const records = await Payroll.find(query).populate("employee", "name code bankName laborCardNumber bankAccount iban agentId");

        if (!records || records.length === 0) {
            return res.status(404).json({ message: "No finalized payroll records found for this period. SIF can only be generated after Finalize." });
        }

        // Missing bank details silently degraded to placeholder strings before
        // ("UNSPECIFIED_BANK", "000000000000") instead of being caught - surface
        // exactly which employee/field is missing so it can be fixed and retried,
        // instead of a generic "SIF Generation failed".
        const missingBankInfo = records
            .filter(r => r.employee && (!r.employee.bankName || (!r.employee.iban && !r.employee.bankAccount)))
            .map(r => ({
                code: r.employee.code,
                name: r.employee.name,
                missing: [
                    !r.employee.bankName && "Bank Name",
                    (!r.employee.iban && !r.employee.bankAccount) && "IBAN/Account Number"
                ].filter(Boolean)
            }));
        if (missingBankInfo.length > 0) {
            return res.status(400).json({
                message: "Some employees are missing required bank details for SIF generation.",
                missingBankInfo
            });
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

        const groupedByBank = records.reduce((acc, record) => {
            const bankName = (record.employee?.bankName || "UNSPECIFIED_BANK").replace(/[^a-zA-Z0-9_-]/g, "_");
            if (!acc[bankName]) acc[bankName] = [];
            acc[bankName].push(record);
            return acc;
        }, {});

        const zipEntries = Object.entries(groupedByBank).map(([bankName, bankRecords]) => {
            let sifContent = `SCR,${employerId},${bankCode},${creationDate},${creationTime},${salaryMonth},${bankRecords.length},${bankRecords.reduce((sum, item) => sum + (item.netSalary || 0), 0).toFixed(2)}\n`;

            bankRecords.forEach(r => {
                const empId = r.employee?.laborCardNumber || r.employee?.code;
                const agentId = r.employee?.agentId || "AGENT001";
                const account = r.employee?.iban || r.employee?.bankAccount || "000000000000";
                const amount = (r.netSalary || 0).toFixed(2);
                const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
                const endDate = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;

                sifContent += `EDR,${empId},${agentId},${account},${startDate},${endDate},30,${amount},${r.basicSalary},${r.totalAllowances},0\n`;
            });

            return {
                name: `bank-transfer/${bankName}_${salaryMonth}.csv`,
                content: sifContent
            };
        });

        let archive;
        try {
            archive = buildZipArchive(zipEntries);
        } catch (zipError) {
            return res.status(500).json({ message: "Failed to build SIF archive: " + zipError.message });
        }

        res.setHeader("Content-Disposition", `attachment; filename="SIF_${employerId}_${creationDate}.zip"`);
        res.setHeader("Content-Type", "application/zip");

        // AUDIT LOG
        PayrollAudit.create({
            action: "SIF_GENERATED",
            performedBy: req.user ? req.user._id : null,
            performedByName: req.user ? req.user.name : "System",
            month,
            year,
            details: `Generated bank transfer ZIP: SIF_${employerId}_${creationDate}.zip`,
            totalNetSalary: totalAmount
        }).catch(console.error);

        res.send(archive);

    } catch (error) {
        // console.error(error);
        res.status(500).json({ message: "SIF Generation failed: " + error.message });
    }
};

// --- API: Generic MOL Compliance Report ---
export const generateMOLReport = async (req, res) => {
    try {
        const { month, year, visaCompany, workPermitCompany } = req.query;

        // 2. Get payroll records for this month (fetched first - needed below to build
        // the employee list too, not just to look up net-paid amounts)
        const payrolls = await Payroll.find({ month, year });
        const payrollMap = {};
        payrolls.forEach(p => {
            if (p.employee) payrollMap[p.employee.toString()] = p;
        });

        // 1. Employee list = every Active employee, UNION every employee who actually
        // has a payroll record this month - was Active-status only, which silently
        // dropped anyone who left/was deactivated mid-month but was still paid that
        // period. A compliance report for a given month must include everyone paid
        // that month regardless of their CURRENT status.
        const employeeFilter = {};
        if (visaCompany) employeeFilter.visaCompany = visaCompany;
        if (workPermitCompany) employeeFilter.workPermitCompany = workPermitCompany;
        const activeEmployees = await Employee.find({ ...employeeFilter, status: "Active" });
        const paidEmployeeIds = payrolls.map(p => p.employee).filter(Boolean);
        const alreadyIncluded = new Set(activeEmployees.map(e => e._id.toString()));
        const missingPaidEmployeeIds = paidEmployeeIds.filter(id => !alreadyIncluded.has(id.toString()));
        const otherPaidEmployees = missingPaidEmployeeIds.length
            ? await Employee.find({ ...employeeFilter, _id: { $in: missingPaidEmployeeIds } })
            : [];
        const employees = [...activeEmployees, ...otherPaidEmployees];

        const reportData = employees.map(emp => {
            const payRecord = payrollMap[emp._id.toString()];
            const isPaid = payRecord && payRecord.status === "PROCESSED";

            return {
                "Visa Company": emp.visaCompany || "N/A",
                "Employee ID": emp.code,
                "Name": emp.name,
                "Labor Card No.": emp.laborCardNumber || "N/A",
                "Contract Basic": emp.basicSalary,
                "Net Paid": payRecord ? payRecord.netSalary : 0,
                "Payment Status": isPaid ? "PAID" : "UNPAID / PENDING",
                "Month": `${month}/${year}`
            };
        });

        // Grouped by visa company (MOL/labour filings are per-sponsor) rather than one
        // flat company-wide list - sort so each sponsor's employees sit together.
        reportData.sort((a, b) => String(a["Visa Company"]).localeCompare(String(b["Visa Company"])) || String(a.Name).localeCompare(String(b.Name)));

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
        const { year, month } = req.query;

        const query = { year, status: "PROCESSED" };
        if (month) query.month = month;
        const records = await Payroll.find(query)
            .populate("employee", "name code department");

        if (records.length === 0) {
            return res.status(404).json({ message: month ? `No payment history found for ${month}/${year}` : `No payment history found for ${year}` });
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
        historyData.sort((a, b) => a.Month - b.Month || String(a.Name).localeCompare(String(b.Name)));

        const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const workbook = XLSX.utils.book_new();

        if (month) {
            // Single month requested - one flat sheet, unchanged from before.
            const worksheet = XLSX.utils.json_to_sheet(historyData);
            XLSX.utils.book_append_sheet(workbook, worksheet, `History_${month}_${year}`);
        } else {
            // "All months" - was one flat sheet mixing every month together with no
            // visual separation. Now one sheet PER month that has data, each with the
            // month name as a title row at the top, so a year-wide export reads as a
            // clear set of monthly statements rather than one undifferentiated list.
            const byMonth = {};
            historyData.forEach((row) => {
                (byMonth[row.Month] ||= []).push(row);
            });
            for (const m of Object.keys(byMonth).map(Number).sort((a, b) => a - b)) {
                const title = `PAYMENT HISTORY - ${MONTH_NAMES[m - 1]?.toUpperCase() || m} ${year}`;
                const worksheet = XLSX.utils.aoa_to_sheet([[title], []]);
                XLSX.utils.sheet_add_json(worksheet, byMonth[m], { origin: -1 });
                // Sheet names are capped at 31 chars and can't repeat - month names are
                // always short/unique within one year's workbook.
                XLSX.utils.book_append_sheet(workbook, worksheet, MONTH_NAMES[m - 1] || `Month ${m}`);
            }
        }

        const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

        const filename = month ? `Payment_History_${month}_${year}.xlsx` : `Payment_History_${year}.xlsx`;
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.send(buffer);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "History Export failed" });
    }
};

/**
 * GET MY PAYSLIPS (Logged-in Employee)
 */
export const getMyPayslips = async (req, res) => {
    try {
        const employeeId = req.user.employeeId;
        if (!employeeId) {
            return res.status(400).json({ message: "Employee ID not found for user" });
        }

        const { year, month } = req.query;
        const query = { employee: employeeId, status: "PROCESSED" };

        if (year) query.year = parseInt(year);
        if (month) query.month = parseInt(month);

        const payslips = await Payroll.find(query)
            .sort({ year: -1, month: -1 })
            .select("-attendanceSummary"); // Exclude heavy nested object if not needed for list, but maybe needed for detail view? 
        // Better to keep it light for list, and maybe full detail for individual fetch? 
        // For now, let's return everything as the user might want to see the details in the expanded view.
        // .select(""); 

        res.json(payslips);
    } catch (error) {
        // console.error(error);
        res.status(500).json({ message: "Failed to fetch payslips" });
    }
};

// --- API: Download Payslip PDF (Mobile) ---
export const downloadPayslip = async (req, res) => {
    try {
        const { id } = req.params;
        const payroll = await Payroll.findById(id).populate("employee", "name code designation department company");

        if (!payroll) {
            return res.status(404).json({ message: "Payslip not found" });
        }

        // Verify Ownership (unless Admin)
        // Assuming req.user is populated by protect middleware
        if (req.user.role !== "Admin" && req.user.employeeId) {
            if (payroll.employee._id.toString() !== req.user.employeeId.toString()) {
                return res.status(403).json({ message: "Unauthorized access to this payslip" });
            }
        }

        const { employee, basicSalary, allowances, deductions, netSalary, attendanceSummary, month, year, periodStart, periodEnd } = payroll;
        const companyName = employee?.company || process.env.COMPANY_NAME || "Company";
        const companyMaster = companyName
            ? await Master.findOne({ type: "COMPANY", name: new RegExp(`^${escapeRegex(companyName)}$`, "i") }).lean()
            : null;
        // Prefer this employee's own company logo (S3 URL from Masters > Company
        // Structure, fetched as a Buffer) or a legacy local-file upload. No
        // cross-tenant fallback to process.env.COMPANY_LOGO - if a company has no
        // logo configured, the payslip renders with no logo rather than borrowing
        // another tenant's.
        const companyLogoSource = companyMaster?.image;
        const companyLogoBuffer = await fetchRemoteLogoBuffer(companyLogoSource);
        const companyLogoPath = companyLogoBuffer ? null : resolveCompanyLogoPath(companyLogoSource);
        const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
        // "Period" used to always show just periodEnd's calendar month/year (e.g.
        // "August 2026"), even when the actual pay period (this app uses a rolling,
        // force-contiguous period system - see generatePayroll - not fixed calendar
        // months) spans back into an earlier month, or several. That made the
        // Attendance Summary's "Total Days" look wrong/impossible (e.g. 67) next to a
        // label implying a single ~30-day month. Show the true date range whenever the
        // period doesn't fall entirely within one calendar month.
        const periodsSpanOneMonth = periodStart && periodEnd
            && new Date(periodStart).getUTCFullYear() === new Date(periodEnd).getUTCFullYear()
            && new Date(periodStart).getUTCMonth() === new Date(periodEnd).getUTCMonth();
        const formatShortDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
        const periodStr = (!periodStart || !periodEnd || periodsSpanOneMonth)
            ? `${monthName} ${year}`
            : `${formatShortDate(periodStart)} – ${formatShortDate(periodEnd)}`;
        const totalAllowances = payroll.totalAllowances || 0;

        // Hide "Salary Advance" from the itemized list, but keep its value subtracted from Net Salary.
        // For the visual "Total Deductions", we will subtract the advance so the math looks correct.
        let displayDeductions = [];
        let hiddenAdvanceAmount = 0;

        (payroll.deductions || []).forEach(d => {
            if (d.name && d.name.toLowerCase().includes("salary advance")) {
                hiddenAdvanceAmount += d.amount;
            } else {
                displayDeductions.push(d);
            }
        });

        const totalDeductions = (payroll.totalDeductions || 0) - hiddenAdvanceAmount;
        const grossEarnings = basicSalary + totalAllowances;

        // 1. Generate Content PDF using PDFKit
        const doc = new PDFDocument({ size: "A4", margin: 50 });
        const buffers = [];
        doc.on("data", buffers.push.bind(buffers));

        // Wait for doc to end
        const docEndPromise = new Promise((resolve) => {
            doc.on("end", () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });
        });

        // --- PDF Generated Content ---
        const pageWidth = 595.28; // A4 width in points
        const centerX = pageWidth / 2;

        // Title
        if (companyLogoBuffer || companyLogoPath) {
            try {
                doc.image(companyLogoBuffer || companyLogoPath, 50, 112, { fit: [90, 46], align: "left", valign: "center" });
            } catch (imageError) {
                console.warn("Unable to embed company logo in payslip PDF:", imageError.message);
            }
        }
        // Company name/PAYSLIP/Period/employee-details box used to sit at hardcoded
        // absolute Y coordinates with only ~17pt of clearance below the company name -
        // a long company name wrapping to 2 lines would overlap "PAYSLIP" below it.
        // Measure each block's actual rendered height (doc.heightOfString respects the
        // currently-active font/size, so call it right after setting fontSize) and
        // derive the next element's Y from it instead, so nothing overlaps regardless
        // of how long the company name is.
        const companyNameY = 138;
        doc.fontSize(12).fillColor("#182d54");
        const companyNameHeight = doc.heightOfString(companyName, { width: 280, align: "center" });
        doc.text(companyName, centerX - 140, companyNameY, { align: "center", width: 280 });

        const payslipY = companyNameY + companyNameHeight + 8;
        doc.fontSize(16).fillColor("#404040");
        const payslipHeight = doc.heightOfString("PAYSLIP", { width: 100, align: "center" });
        doc.text("PAYSLIP", centerX - 50, payslipY, { align: "center", width: 100 });

        const periodY = payslipY + payslipHeight + 4;
        const periodText = `Period: ${periodStr}`;
        doc.fontSize(12).fillColor("#646464");
        const periodHeight = doc.heightOfString(periodText, { width: 200, align: "center" });
        doc.text(periodText, centerX - 100, periodY, { align: "center", width: 200 });

        // Employee Details Box, use Y to continue flow but reset after explicit positioning
        doc.y = periodY + periodHeight + 9;
        const startY = doc.y;
        doc.rect(40, startY, pageWidth - 80, 70).fill("#FAFAFA");
        doc.fillColor("#000000");

        // Left Column
        doc.fontSize(10).font("Helvetica");
        doc.text("Employee Name:", 50, startY + 10);
        doc.font("Helvetica-Bold").text(employee?.name || "Unknown", 140, startY + 10);

        doc.font("Helvetica").text("Designation:", 50, startY + 30);
        doc.font("Helvetica-Bold").text(employee?.designation || "N/A", 140, startY + 30);

        // Right Column
        const rightColX = centerX + 10;
        doc.font("Helvetica").text("Employee ID:", rightColX, startY + 10);
        doc.font("Helvetica-Bold").text(employee?.code || "N/A", rightColX + 80, startY + 10);

        doc.font("Helvetica").text("Department:", rightColX, startY + 30);
        doc.font("Helvetica-Bold").text(employee?.department || "N/A", rightColX + 80, startY + 30);

        doc.moveDown(4);

        // Attendance Summary Table
        const attendanceY = doc.y + 20;
        doc.font("Helvetica-Bold").fontSize(11).text("Attendance Summary", 40, attendanceY);
        doc.moveDown(0.5);

        // Simple Table Header
        const tableTop = doc.y;
        doc.rect(40, tableTop, pageWidth - 80, 20).fill("#F0F0F0");
        doc.fillColor("#323232").fontSize(9);
        doc.text("Total Days", 50, tableTop + 6);
        doc.text("Present", 150, tableTop + 6);
        doc.text("Absent", 250, tableTop + 6);
        doc.text("Late", 350, tableTop + 6); // Late days count
        doc.text("Overtime (Hrs)", 450, tableTop + 6);

        // Table Body
        doc.rect(40, tableTop + 20, pageWidth - 80, 20).stroke();
        doc.fillColor("#000000").font("Helvetica");
        doc.text(String(attendanceSummary?.totalDays || 30), 50, tableTop + 26);
        doc.text(String(attendanceSummary?.daysPresent || 0), 150, tableTop + 26);
        doc.text(String(attendanceSummary?.daysAbsent || 0), 250, tableTop + 26);
        doc.text(String(attendanceSummary?.late || 0), 350, tableTop + 26);
        doc.text(String(attendanceSummary?.overtimeHours || 0), 450, tableTop + 26);

        doc.moveDown(3);

        // Earnings & Deductions
        const salaryY = doc.y + 20;

        // Column geometry - two side-by-side blocks. Each amount is right-aligned
        // inside a box; the box's x is its LEFT edge (pdfkit convention), not the
        // desired right edge. The left column's amount box used to start at
        // centerX-10 (already near the middle) and extend rightward with the SAME
        // width as the right column, landing on top of/inside the Deductions block -
        // and the right column's box started at pageWidth-50 and extended further
        // right by that same width, running off the page entirely. Net effect:
        // deduction amounts (both per-row and the Total Deductions figure) never
        // rendered at all, and the earnings amount visually overlapped into the
        // Deductions column. Both boxes now start at their own column's left edge
        // and share one width so they end exactly at the divider / right margin.
        const amountColWidth = centerX - 60;
        const leftAmountX = 50;
        const rightAmountX = centerX + 10;

        // Headers
        doc.rect(40, salaryY, (pageWidth - 80) / 2, 20).fill("#182d54");
        doc.rect(centerX, salaryY, (pageWidth - 80) / 2, 20).fill("#182d54");

        doc.fillColor("#FFFFFF").font("Helvetica-Bold");
        doc.text("Earnings", 50, salaryY + 6);
        doc.text("Amount (AED)", leftAmountX, salaryY + 6, { align: "right", width: amountColWidth });

        doc.text("Deductions", centerX + 10, salaryY + 6);
        doc.text("Amount (AED)", rightAmountX, salaryY + 6, { align: "right", width: amountColWidth });

        // Rows
        let currentY = salaryY + 20;
        doc.fillColor("#000000").font("Helvetica");

        const earnings = [
            { name: "Basic Salary", amount: basicSalary },
            ...(allowances || []).map(a => ({ name: a.name, amount: a.amount }))
        ];
        const deductionList = displayDeductions;
        const maxRows = Math.max(earnings.length, deductionList.length);

        for (let i = 0; i < maxRows; i++) {
            const earn = earnings[i];
            const ded = deductionList[i];

            if (earn) {
                doc.text(earn.name, 50, currentY + 6);
                doc.text(earn.amount.toFixed(2), leftAmountX, currentY + 6, { align: "right", width: amountColWidth });
            }
            if (ded) {
                doc.text(ded.name, centerX + 10, currentY + 6);
                doc.text(ded.amount.toFixed(2), rightAmountX, currentY + 6, { align: "right", width: amountColWidth });
            }

            // Draw line
            doc.moveTo(40, currentY + 20).lineTo(pageWidth - 40, currentY + 20).strokeColor("#E5E7EB").stroke();
            currentY += 20;
        }

        // Totals Row
        doc.rect(40, currentY, (pageWidth - 80), 25).fill("#F3F4F6");
        doc.fillColor("#000000").font("Helvetica-Bold");

        doc.text("Total Earnings", 50, currentY + 8);
        doc.text(grossEarnings.toFixed(2), leftAmountX, currentY + 8, { align: "right", width: amountColWidth });

        doc.text("Total Deductions", centerX + 10, currentY + 8);
        doc.text(totalDeductions.toFixed(2), rightAmountX, currentY + 8, { align: "right", width: amountColWidth });

        currentY += 35;

        // Net Pay
        doc.rect(40, currentY, pageWidth - 80, 30).fill("#F0FDF4"); // Light Green
        doc.rect(40, currentY, pageWidth - 80, 30).strokeColor("#16A34A").lineWidth(2).stroke();

        doc.fillColor("#15803D").font("Helvetica-Bold").fontSize(14);
        doc.text("NET SALARY PAYABLE", 60, currentY + 8);
        doc.text(`${netSalary.toFixed(2)} AED`, pageWidth - 200, currentY + 8, { align: "right", width: 150 });

        // Footer / Signatures
        const footerY = currentY + 60;
        doc.lineWidth(1).strokeColor("#374151");

        doc.moveTo(60, footerY).lineTo(200, footerY).stroke();
        doc.fontSize(10).fillColor("#6B7280").text("Employee Signature", 60, footerY + 5, { width: 140, align: "center" });

        doc.moveTo(pageWidth - 200, footerY).lineTo(pageWidth - 60, footerY).stroke();
        doc.text("Employer Signature", pageWidth - 200, footerY + 5, { width: 140, align: "center" });

        doc.end();

        const contentPdfBuffer = await docEndPromise;

        // 2. Setup Template & Merge using pdf-lib
        // Letter_Head_-_Group_2023.pdf is Leptis Group's own letterhead (their logo,
        // Arabic mark, address, and subsidiary-company footer bar) - it used to be
        // overlaid on every payslip regardless of which company the employee
        // actually belongs to, so a Rizan employee's payslip showed Leptis branding.
        // Only apply it for Leptis employees; every other company gets the plain
        // PDFKit content page above, which already carries that company's own name
        // and logo (from Masters > Company Structure).
        const LEPTIS_COMPANY_NAMES = ["LEPTIS HYPERMARKET LLC", "LEPTIS", "LEPTIS HYPERMARKET"];
        const isLeptisCompany = LEPTIS_COMPANY_NAMES.some((n) => n.toLowerCase() === String(companyName).toLowerCase());
        const templatePath = path.join(__dirname, "../assets/templates/Letter_Head_-_Group_2023.pdf");

        // Non-Leptis companies (or if the template file is missing) get the plain content PDF.
        if (!isLeptisCompany || !fs.existsSync(templatePath)) {
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename="Payslip_${monthName}_${year}.pdf"`);
            return res.send(contentPdfBuffer);
        }

        const templateBytes = fs.readFileSync(templatePath);
        const templatePdf = await PDFLibDocument.load(templateBytes);
        const contentPdf = await PDFLibDocument.load(contentPdfBuffer);

        // Embed content page
        const [contentPage] = await templatePdf.embedPdf(contentPdf, [0]);
        const firstPage = templatePdf.getPages()[0];
        const { width, height } = firstPage.getSize();

        // Overlay
        firstPage.drawPage(contentPage, {
            x: 0,
            y: 0,
            width,
            height,
        });

        // Serialize
        const pdfBytes = await templatePdf.save();
        const finalBuffer = Buffer.from(pdfBytes);

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="Payslip_${monthName}_${year}.pdf"`);
        res.send(finalBuffer);

    } catch (error) {
        // console.error(error);
        res.status(500).json({ message: "PDF Generation Failed: " + error.message });
    }
};
