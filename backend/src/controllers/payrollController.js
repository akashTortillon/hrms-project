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
import PayslipExportJob from "../models/payslipExportJobModel.js";
import PDFDocument from "pdfkit";
import { PDFDocument as PDFLibDocument } from "pdf-lib";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { buildZipArchive } from "../utils/zip.js";
import { storeUploadedFile, getSignedFileUrl } from "../utils/storage.js";
import { logActivity } from "../utils/activityLogger.js";
import { holidaySetFromHolidays, isWeekOff, applyMonthlyFlexQuota } from "../utils/attendanceUtils.js";
import { resolveCompanyLogoBuffer } from "./masterController.js";
import { escapeRegex } from "../utils/stringUtils.js";
import { amountToWordsAED } from "../utils/numberToWords.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const toNumber = (value) => Number(String(value || 0).replace(/[^0-9.-]+/g, "")) || 0;

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

// True only if an active PAYROLL_RULE Master resolves to an automatic ABSENT_DAYS
// deduction - mirrors the exact predicate generatePayroll's Dynamic Rule Engine
// uses (including the legacy code==="LOP"/name-includes-"Unpaid" fallback for
// rules with no explicit metadata.basis) so generatePayroll and getPayrollRuleHealth
// can never disagree about whether absence actually reduces pay.
const computeHasActiveAbsenceDeductionRule = (rules = []) => rules.some((rule) => {
    const meta = rule.metadata || {};
    if (!meta.isAutomatic || meta.category !== "DEDUCTION") return false;
    let basis = meta.basis;
    if (!basis && (rule.code === "LOP" || (rule.name && rule.name.includes("Unpaid")))) basis = "ABSENT_DAYS";
    return basis === "ABSENT_DAYS";
});

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

// Cheap, read-only check so the dashboard can warn BEFORE generating payroll that
// absence won't reduce pay. Uses the same computeHasActiveAbsenceDeductionRule
// predicate generatePayroll's Dynamic Rule Engine is built on, so this can never
// drift out of sync with what actually happens on Generate.
export const getPayrollRuleHealth = async (req, res) => {
    try {
        const rules = await Master.find({ type: "PAYROLL_RULE", isActive: true });
        res.json({ hasActiveAbsenceDeductionRule: computeHasActiveAbsenceDeductionRule(rules) });
    } catch (error) {
        res.status(500).json({ message: "Failed to check payroll rule health" });
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

        // Regenerating an existing DRAFT period used to rebuild allowances/deductions
        // purely from fresh AUTO calculation and unconditionally overwrite the whole
        // arrays in the bulkWrite below - destroying any type:"MANUAL" item added via
        // addAdjustment (or a loan override) since the draft was first created. Pull
        // the current draft per employee up front so its MANUAL items can be carried
        // forward into the freshly-computed arrays instead of being wiped.
        const existingDraftPayrolls = await Payroll.find({
            periodStart, periodEnd, status: "DRAFT",
            employee: { $in: employees.map(e => e._id) }
        }).select("employee allowances deductions").lean();
        const existingDraftByEmployee = new Map(
            existingDraftPayrolls.map(p => [p.employee.toString(), p])
        );

        // Absence is always tracked correctly in attendanceSummary (shown on the
        // payslip) regardless of this - but it only ever reduces pay if an active
        // rule resolves to basis "ABSENT_DAYS" and category "DEDUCTION". Surfaced to
        // the frontend so a misconfigured/missing rule doesn't fail silently.
        const hasActiveAbsenceDeductionRule = computeHasActiveAbsenceDeductionRule(rules);

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

            // MANUAL items to carry forward from the existing draft (see fetch above).
            const existingDraft = existingDraftByEmployee.get(emp._id.toString());
            const preservedManualAllowances = (existingDraft?.allowances || []).filter(a => a.type === "MANUAL");
            const preservedManualDeductions = (existingDraft?.deductions || []).filter(d => d.type === "MANUAL");
            // A MANUAL loan-override deduction (addAdjustment tags it with
            // `meta: "Req ID: <id>"`, same convention the AUTO loan deduction below
            // uses) and a freshly-recomputed AUTO deduction for that SAME request would
            // otherwise both end up in deductionList once regenerate stops wiping
            // MANUAL items - double-deducting that loan. Skip the AUTO push for any
            // Req ID already covered by a preserved MANUAL item.
            const manuallyOverriddenLoanReqIds = new Set(
                preservedManualDeductions
                    .map(d => String(d.meta || "").match(/Req ID:\s*([A-Za-z0-9]+)/)?.[1])
                    .filter(Boolean)
            );

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

                    if (manuallyOverriddenLoanReqIds.has(req.requestId)) {
                        continue;
                    }

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

            // Carry forward preserved MANUAL items now that the AUTO lists are final
            // (the loan-dedup guard above already ran against manuallyOverriddenLoanReqIds).
            allowanceList.push(...preservedManualAllowances);
            deductionList.push(...preservedManualDeductions);

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
            periodEnd,
            hasActiveAbsenceDeductionRule
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

// ---- Shared payroll-report model + PDF renderer ----------------------------------
// Excel and PDF exports read the SAME row arrays (buildWorkReportRows /
// buildPayrollSheetRows) so the two formats can't drift apart.

const isPdfRequest = (req) => String(req.query.format || "").toLowerCase() === "pdf";

const sendReportPdf = (req, res, buffer, fileName) => {
    const disposition = req.query.inline === "1" ? "inline" : "attachment";
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `${disposition}; filename="${fileName}"`);
    res.send(buffer);
};

// Location / Visa / WPS "work report" rows (11 columns) - used by exportPayroll's Excel
// and PDF output.
const buildWorkReportRows = (records) => {
    let serialNo = 1;
    return records.map((r) => {
        const emp = r.employee || {};
        const fixed = r.basicSalary || 0;
        const net = r.netSalary || 0;
        // Variable = Net - Fixed (allowances - deductions + OT), as in the original export.
        const variable = net - fixed;
        const lopDays = r.attendanceSummary ? (r.attendanceSummary.daysAbsent + r.attendanceSummary.unpaidLeaves) : 0;
        const paidLeaves = r.attendanceSummary ? (r.attendanceSummary.paidLeaves || 0) : 0;
        return [
            serialNo++,
            emp.name || "Unknown",
            emp.laborCardNumber || "Not Provided",
            emp.personalId || "Not Provided",
            emp.bankName || "Not Provided",
            emp.iban || emp.bankAccount || "Not Provided",
            lopDays,
            paidLeaves,
            fixed,
            variable,
            net
        ];
    });
};

const WORK_REPORT_HEADERS = [
    "Sl.No", "NAME OF THE EMPLOYEE", "WORK PERMIT NO (8 DIGIT NO)", "PERSONAL NO (14 DIGIT NO)",
    "BANK NAME", "FAB CARD NO(16 DIGITS) OR IBAN FOR PERSONAL", "LOP DAYS", "PAID LEAVES",
    "Fixed", "Variable", "Total"
];

// Generic landscape-A4 table PDF: optional group-header row, wrapped cells, header row
// repeated on every page, page numbers. `types` per column: "text" | "int" | "money".
const renderReportPdf = ({ titleLines, groups = null, headers, rows, weights, types, fontSize = 8, footerLabels = null }) => new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margins: { top: 26, bottom: 6, left: 24, right: 24 }, bufferPages: true });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const L = 24;
    const W = doc.page.width - 48;
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const colW = weights.map((w) => (w / totalWeight) * W);
    const colX = colW.map((_, i) => L + colW.slice(0, i).reduce((a, b) => a + b, 0));
    const BEIGE = "#F3E6CC";
    const GOLD_DARK = "#8A5A0B";
    const GRID = "#D1D5DB";
    const INK = "#111827";
    const pad = 3;
    const bottomLimit = doc.page.height - 36;
    const alignFor = (i) => (types[i] === "money" || types[i] === "int" ? "right" : "left");
    const fmt = (v, t) => {
        if (v === null || v === undefined || v === "") return "";
        return t === "money" ? payslipMoney(v) : String(v);
    };

    let y = 26;
    titleLines.forEach((line) => {
        doc.font(line.bold ? "Helvetica-Bold" : "Helvetica").fontSize(line.size || 10).fillColor(line.color || INK)
            .text(line.text, L, y, { width: W, align: "center", lineBreak: false });
        y += (line.size || 10) + 5;
    });
    y += 6;

    const drawHeader = () => {
        let hy = y;
        doc.font("Helvetica-Bold").fontSize(fontSize);
        if (groups) {
            const gh = 16;
            groups.forEach((g) => {
                const x = colX[g.from];
                const w = colX[g.to] + colW[g.to] - x;
                doc.rect(x, hy, w, gh).fillAndStroke(BEIGE, GRID);
                doc.fillColor(GOLD_DARK).text(g.label, x, hy + 4.5, { width: w, align: "center", lineBreak: false });
            });
            hy += gh;
        }
        const hh = Math.max(...headers.map((h, i) => doc.heightOfString(h, { width: colW[i] - 2 * pad }))) + 8;
        headers.forEach((h, i) => {
            doc.rect(colX[i], hy, colW[i], hh).fillAndStroke(BEIGE, GRID);
            doc.fillColor(GOLD_DARK).text(h, colX[i] + pad, hy + 4, { width: colW[i] - 2 * pad, align: "center" });
        });
        y = hy + hh;
    };
    drawHeader();

    rows.forEach((row) => {
        doc.font("Helvetica").fontSize(fontSize);
        const cells = row.map((v, i) => fmt(v, types[i]));
        const rh = Math.max(15, Math.max(...cells.map((c, i) => doc.heightOfString(c, { width: colW[i] - 2 * pad }))) + 6);
        if (y + rh > bottomLimit) {
            doc.addPage();
            y = 26;
            drawHeader();
            doc.font("Helvetica").fontSize(fontSize);
        }
        cells.forEach((c, i) => {
            doc.rect(colX[i], y, colW[i], rh).lineWidth(0.5).strokeColor(GRID).stroke();
            doc.fillColor(INK).text(c, colX[i] + pad, y + 3, { width: colW[i] - 2 * pad, align: alignFor(i) });
        });
        y += rh;
    });

    if (footerLabels) {
        if (y + 60 > bottomLimit) { doc.addPage(); y = 26; }
        y += 40;
        doc.save().lineWidth(0.8).strokeColor("#374151");
        const half = W / 2;
        footerLabels.forEach((label, i) => {
            const x = L + i * half + 30;
            doc.moveTo(x, y).lineTo(x + half - 100, y).stroke();
        });
        doc.restore();
        footerLabels.forEach((label, i) => {
            doc.font("Helvetica-Bold").fontSize(8).fillColor(GOLD_DARK)
                .text(label, L + i * half + 30, y + 5, { width: half - 100, align: "center", lineBreak: false });
        });
    }

    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.font("Helvetica").fontSize(7).fillColor("#6B7280");
        doc.text(`Generated ${new Date().toLocaleString("en-GB")}`, L, doc.page.height - 22, { width: W / 2, align: "left", lineBreak: false });
        doc.text(`Page ${i + 1} of ${range.count}`, L + W / 2, doc.page.height - 22, { width: W / 2, align: "right", lineBreak: false });
    }
    doc.end();
});

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

        // Data Rows (shared with the PDF export below)
        const dataRows = buildWorkReportRows(records);

        if (isPdfRequest(req)) {
            const pdf = await renderReportPdf({
                titleLines: [
                    { text: COMPANY_NAME, bold: true, size: 13 },
                    { text: MOL_ID, size: 9 },
                    { text: REPORT_TITLE, bold: true, size: 11, color: "#8A5A0B" }
                ],
                groups: [{ label: "Employee's Net Salary", from: 8, to: 10 }],
                headers: WORK_REPORT_HEADERS,
                rows: dataRows,
                weights: [4, 20, 13, 14, 11, 21, 6, 6, 8, 8, 9],
                types: ["int", "text", "text", "text", "text", "text", "int", "int", "money", "money", "money"],
                fontSize: 7.5
            });
            PayrollAudit.create({
                action: "EXPORTED",
                performedBy: req.user ? req.user._id : null,
                performedByName: req.user ? req.user.name : "System",
                month,
                year,
                details: `Exported ${reportPrefix} PDF Report`
            }).catch(console.error);
            return sendReportPdf(req, res, pdf, `${reportPrefix.replace(/\s+/g, "_")}_${month}_${year}.pdf`);
        }
        dataRows.forEach((row) => aoa.push(row));

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

// The two fixed allowance names generatePayroll always pushes as AUTO items (see
// "2.2 FIXED EMPLOYEE ALLOWANCES" above) - excluded from the collapsed ADDITIONS
// column below since they're already broken out into their own ALLOWANCE/HRA
// columns, matching the client's template. Everything else (ad-hoc allowances,
// overtime, manual adjustments) collapses into one ADDITIONS row.
const FIXED_ALLOWANCE_NAMES = new Set(["Housing Rent Allowance (HRA)", "Other Allowance"]);

// Collapses a payroll's allowances/deductions array into one {name, amount, comments}
// triple for the template's single NAME/AMOUNT/COMMENTS column group - joins names
// and any reason/meta text with ", ", sums amounts via sumAmounts (same 2dp-rounded
// summation every other total on the payslip uses).
const collapseLineItems = (items = [], { exclude } = {}) => {
    const filtered = exclude ? items.filter((i) => !exclude.has(i?.name)) : items;
    if (!filtered.length) return { name: "", amount: 0, comments: "" };
    const name = filtered.map((i) => i.name).filter(Boolean).join(", ");
    const comments = filtered
        .map((i) => i.reason || (typeof i.meta === "string" ? i.meta : ""))
        .filter(Boolean)
        .join(", ");
    return { name, amount: sumAmounts(filtered), comments };
};

const PAYROLL_SHEET_HEADERS = [
    "ID", "NAME", "PERSONAL ID", "IBAN", "COMPANY", "BRANCH",
    "BASIC", "ALLOWANCE", "HRA", "SALARY",
    "NAME", "AMOUNT", "COMMENTS",
    "NAME", "AMOUNT", "COMMENTS",
    "NET SALARY"
];

// One 17-value row per employee in the client's Payroll Sheet template (used by both the
// Excel and PDF exports).
const buildPayrollSheetRows = (validRecords) => validRecords.map((r) => {
    const emp = r.employee || {};
    const basicSalary = round2(r.basicSalary || 0);
    const allowance = Number(emp.allowance) || 0;
    const hra = Number(emp.hra) || 0;
    const totalAllowances = round2(r.totalAllowances || 0);
    const salary = round2(basicSalary + totalAllowances);
    const additions = collapseLineItems(r.allowances || [], { exclude: FIXED_ALLOWANCE_NAMES });
    const deductions = collapseLineItems(r.deductions || []);
    return [
        emp.code || "",
        emp.name || "",
        emp.personalId || "",
        emp.iban || emp.bankAccount || "",
        emp.company || "",
        emp.branch || "",
        basicSalary,
        allowance,
        hra,
        salary,
        additions.name,
        additions.amount,
        additions.comments,
        deductions.name,
        deductions.amount,
        deductions.comments,
        round2(r.netSalary || 0)
    ];
});

// --- API: Export "Payroll Sheet" (client-template-matched export, alongside the
// existing exportPayroll WPS-format report - a different, non-WPS layout) ---
export const exportPayrollSheet = async (req, res) => {
    try {
        const { month, year } = req.query;
        if (!month || !year) {
            return res.status(400).json({ message: "month and year are required." });
        }

        const records = await Payroll.find({ month, year }).populate({
            path: "employee",
            select: "name code personalId iban bankAccount company branch allowance hra"
        });

        const validRecords = records.filter((r) => r.employee);
        if (!validRecords.length) {
            return res.status(404).json({ message: "No payroll records found for this month." });
        }

        const aoa = [];
        aoa.push(["PAYROLL SHEET"]);
        aoa.push(["INFO", "", "", "", "", "", "SALARY DETAILS", "", "", "", "ADDITIONS", "", "", "DEDUCTIONS", "", "", "PAYABLE"]);
        aoa.push(PAYROLL_SHEET_HEADERS);

        const sheetRows = buildPayrollSheetRows(validRecords);

        if (isPdfRequest(req)) {
            const monthNames = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
            const pdf = await renderReportPdf({
                titleLines: [
                    { text: "PAYROLL SHEET", bold: true, size: 14 },
                    { text: `Month: ${monthNames[parseInt(month, 10) - 1] || month} ${year}`, size: 10, color: "#8A5A0B" }
                ],
                groups: [
                    { label: "INFO", from: 0, to: 5 },
                    { label: "SALARY DETAILS", from: 6, to: 9 },
                    { label: "ADDITIONS", from: 10, to: 12 },
                    { label: "DEDUCTIONS", from: 13, to: 15 },
                    { label: "PAYABLE", from: 16, to: 16 }
                ],
                headers: PAYROLL_SHEET_HEADERS,
                rows: sheetRows,
                weights: [8.5, 11.5, 11.5, 19, 8, 7.5, 8, 9.5, 7, 8.5, 6, 7.5, 9.5, 8.5, 8.5, 10, 8.5],
                types: ["text", "text", "text", "text", "text", "text", "money", "money", "money", "money", "text", "money", "text", "text", "money", "text", "money"],
                fontSize: 6.5,
                footerLabels: ["PAYROLL VERIFICATION", "HR VERIFICATION"]
            });
            PayrollAudit.create({
                action: "EXPORTED",
                performedBy: req.user ? req.user._id : null,
                performedByName: req.user ? req.user.name : "System",
                month,
                year,
                details: "Exported Payroll Sheet PDF"
            }).catch(console.error);
            return sendReportPdf(req, res, pdf, `Payroll_Sheet_${month}_${year}.pdf`);
        }
        sheetRows.forEach((row) => aoa.push(row));

        aoa.push([]);
        aoa.push(["PAYROLL VERIFICATION", "", "", "", "", "", "", "", "HR VERIFICATION"]);

        const worksheet = XLSX.utils.aoa_to_sheet(aoa);
        worksheet['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 16 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
            { s: { r: 1, c: 6 }, e: { r: 1, c: 9 } },
            { s: { r: 1, c: 10 }, e: { r: 1, c: 12 } },
            { s: { r: 1, c: 13 }, e: { r: 1, c: 15 } }
        ];
        worksheet['!cols'] = [
            { wch: 12 }, { wch: 24 }, { wch: 16 }, { wch: 22 }, { wch: 16 }, { wch: 14 },
            { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
            { wch: 20 }, { wch: 12 }, { wch: 24 },
            { wch: 20 }, { wch: 12 }, { wch: 24 },
            { wch: 14 }
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, `Payroll_Sheet_${month}_${year}`);
        const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

        res.setHeader("Content-Disposition", `attachment; filename="Payroll_Sheet_${month}_${year}.xlsx"`);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

        PayrollAudit.create({
            action: "EXPORTED",
            performedBy: req.user ? req.user._id : null,
            performedByName: req.user ? req.user.name : "System",
            month,
            year,
            details: "Exported Payroll Sheet"
        }).catch(console.error);

        res.send(buffer);
    } catch (error) {
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
            // Admin accounts are frequently pure system/IT logins with no
            // corresponding real Employee record at all (never had one, not a
            // broken link) - MyPayslipsWidget renders unconditionally on the
            // admin dashboard regardless of whether this admin has a linked
            // employee. Treat that specific case as "no payslips" (200, empty),
            // not an error - the 400 stays for everyone else, where a missing
            // employeeId really does mean a broken account link that needs
            // fixing (see MyPayslipsWidget.jsx's distinct error-state render).
            if (req.user.role === "Admin") {
                return res.json([]);
            }
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
// Resolves a company's payslip branding (logo + whether it gets the Leptis
// Group letterhead) once per company name, cached in the Map the caller
// provides - a bulk export loops many employees who often share a company, and
// without this each one would re-hit S3/Mongo for the identical logo.
const resolveCompanyBranding = async (companyName, brandingCache) => {
    if (brandingCache.has(companyName)) return brandingCache.get(companyName);

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
    const LEPTIS_COMPANY_NAMES = ["LEPTIS HYPERMARKET LLC", "LEPTIS", "LEPTIS HYPERMARKET"];
    const isLeptisCompany = LEPTIS_COMPANY_NAMES.some((n) => n.toLowerCase() === String(companyName).toLowerCase());

    const branding = { companyLogoBuffer, companyLogoPath, isLeptisCompany };
    brandingCache.set(companyName, branding);
    return branding;
};

// Employee fields buildPayslipPdfBuffer needs (accommodation/vehicle are rendered on the
// slip only - see buildPayslipRows).
const PAYSLIP_EMPLOYEE_FIELDS = "name code designation department company accommodationAllowance vehicleAllowance";

const payslipMoney = (n) => Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Row model for the payslip (Kayzan "SALARY SLIP" layout). Presentation only - never
// touches stored payroll figures:
//  - Basic Salary, Housing Rent Allowance (HRA) and Other Allowance come from the
//    payroll's own fixed allowance lines.
//  - "Allowances" is the sum of the remaining ad-hoc lines (appraisal add-ons, manual
//    adjustments); overtime is kept as its own "Overtime" row so it stays visible.
//  - Accommodation / Vehicle Expense are CTC-only and deliberately NOT part of the
//    payroll's earnings (see generatePayroll). The slip layout still shows them in both
//    columns, so they are added to Earnings AND Deductions in equal amounts at render
//    time - Total Earnings / Total Deductions include them, Net Salary is unchanged.
//  - "Salary Advance" lines stay hidden from the list (existing behaviour) while still
//    being reflected in net salary.
const buildPayslipRows = (payroll) => {
    const emp = payroll.employee || {};
    const lines = payroll.allowances || [];
    const sum = (arr) => round2(arr.reduce((s, a) => s + (Number(a?.amount) || 0), 0));
    const hraLines = lines.filter((a) => a.name === "Housing Rent Allowance (HRA)");
    const otherLines = lines.filter((a) => a.name === "Other Allowance");
    const overtimeLines = lines.filter((a) => a.category === "OVERTIME");
    const adhocLines = lines.filter((a) => !FIXED_ALLOWANCE_NAMES.has(a.name) && a.category !== "OVERTIME");

    const accommodation = round2(Number(emp.accommodationAllowance) || 0);
    const vehicle = round2(Number(emp.vehicleAllowance) || 0);
    const basic = round2(payroll.basicSalary || 0);

    const earnings = [{ name: "Basic Salary", amount: basic }];
    if (sum(adhocLines)) earnings.push({ name: "Allowances", amount: sum(adhocLines) });
    if (sum(hraLines)) earnings.push({ name: "Housing Rent Allowance (HRA)", amount: sum(hraLines) });
    if (sum(otherLines)) earnings.push({ name: "Other Allowance", amount: sum(otherLines) });
    if (sum(overtimeLines)) earnings.push({ name: "Overtime", amount: sum(overtimeLines) });
    if (accommodation) earnings.push({ name: "Accommodation Expense", amount: accommodation });
    if (vehicle) earnings.push({ name: "Vehicle Expense", amount: vehicle });

    const deductions = [];
    let hiddenAdvance = 0;
    for (const d of payroll.deductions || []) {
        if (/salary advance/i.test(d.name || "")) {
            hiddenAdvance += Number(d.amount) || 0;
            continue;
        }
        // The absence deduction's NAME is whatever the admin called the Payroll Rule
        // (e.g. "UNPAID"); its meta is the stable "<n> Absent" marker generatePayroll writes.
        const isAbsent = /\babsent\b/i.test(String(d.meta || ""));
        deductions.push({ name: isAbsent ? "Absent Deduction" : d.name, amount: round2(d.amount) });
    }
    if (accommodation) deductions.push({ name: "Accommodation Expense", amount: accommodation });
    if (vehicle) deductions.push({ name: "Vehicle Expense", amount: vehicle });

    const totalEarnings = round2(basic + (payroll.totalAllowances || 0) + accommodation + vehicle);
    const totalDeductions = round2((payroll.totalDeductions || 0) - hiddenAdvance + accommodation + vehicle);
    return { earnings, deductions, totalEarnings, totalDeductions };
};

// Draws the Kayzan "SALARY SLIP" layout onto a fresh, margin-less A4 PDFKit doc. Every
// position is absolute (no auto page breaks), so vertical spacing is derived from
// measured text heights and a compact mode keeps long slips (many lines, or the Leptis
// letterhead's reserved top band) on one page.
const drawKayzanPayslip = (doc, d) => {
    const pageW = 595.28;
    const L = 40;
    const R = pageW - 40;
    const W = R - L;
    const GOLD = "#B07D1E";
    const GOLD_DARK = "#8A5A0B";
    const GOLD_LINE = "#D9B76A";
    const BEIGE = "#F3E6CC";
    const BEIGE_LIGHT = "#FBF6EC";
    const ROW_LINE = "#E5E7EB";
    const INK = "#111827";
    const MUTED = "#6B7280";
    const RED = "#DC2626";

    const { earnings, deductions, totalEarnings, totalDeductions } = d.rows;
    const rowCount = Math.max(earnings.length, deductions.length, 5);
    const letterhead = d.isLeptisCompany; // letterhead supplies its own logo/branding
    const compact = letterhead || rowCount > 9;
    const gap = compact ? 9 : 14;

    // Measure the variable-height blocks up front so the table row height can be chosen
    // to keep the whole slip on one page (and above the Leptis letterhead's footer band).
    const colW = W / 4;
    const fields = [
        ["EMPLOYEE NAME", d.employee?.name || "Unknown"],
        ["EMPLOYEE ID", d.employee?.code || "N/A"],
        ["DESIGNATION", d.employee?.designation || "N/A"],
        ["DEPARTMENT", d.employee?.department || "N/A"]
    ];
    doc.font("Helvetica-Bold").fontSize(11.5);
    const valueH = Math.max(...fields.map(([, v]) => doc.heightOfString(String(v), { width: colW - 18 })));
    const fieldsH = 10 + 13 + valueH + 6;
    const words = amountToWordsAED(d.netSalary);
    doc.font("Helvetica").fontSize(11);
    const wordsH = doc.heightOfString(words, { width: W - 100 });
    const stripH = Math.max(28, wordsH + 16);

    const headH = 26;
    const attHeadH = compact ? 19 : 23;
    const attBodyH = compact ? 54 : 66;
    const netH = compact ? 58 : 70;
    const sigGap = compact ? 40 : 74;
    const startY = letterhead ? 100 : 34;
    const maxY = letterhead ? 744 : 806;
    const fixedH = (letterhead ? 62 : 72) + 8 + (d.companyName ? 14 : 0) + fieldsH + 4 + gap
        + attHeadH + attBodyH + gap + (headH * 2 + 2) + gap + 2 + netH + gap + stripH + sigGap + 20;
    let rowH = 15;
    for (const candidate of (compact ? [21, 19, 17, 15] : [27, 24, 21, 19, 17, 15])) {
        rowH = candidate;
        if (startY + fixedH + rowCount * candidate <= maxY) break;
    }

    const hRule = (y, color = GOLD_LINE, width = 1) => {
        doc.save().lineWidth(width).strokeColor(color).moveTo(L, y).lineTo(R, y).stroke().restore();
    };

    let y = startY;

    // ---- Header: brand (left) | SALARY SLIP + month (right)
    // Brand = the employee's OWN company logo (Masters > Company Structure). Only when
    // that company has no (usable) logo does it fall back to the Kayzan Group mark, so a
    // payslip never goes out unbranded. Leptis payslips get the letterhead's branding.
    if (!letterhead) {
        let drewCompanyLogo = false;
        const logoSource = d.companyLogoBuffer || d.companyLogoPath;
        if (logoSource) {
            try {
                // fit keeps the aspect ratio inside a 200x58 box; PDFKit only reads
                // PNG/JPEG, so any other format throws and drops to the fallback below.
                doc.image(logoSource, L, y, { fit: [200, 58], align: "left", valign: "center" });
                drewCompanyLogo = true;
            } catch (imageError) {
                console.warn("Unable to embed company logo in payslip PDF:", imageError.message);
            }
        }
        if (!drewCompanyLogo) {
            doc.save();
            doc.translate(L, y).scale(58 / 200);
            doc.lineWidth(9).strokeColor(GOLD).circle(100, 100, 90).stroke();
            doc.lineWidth(18).lineCap("round").lineJoin("round").strokeColor(GOLD);
            doc.moveTo(72, 52).lineTo(72, 148).stroke();
            doc.moveTo(72, 100).lineTo(128, 52).stroke();
            doc.moveTo(72, 100).lineTo(128, 148).stroke();
            doc.restore();
            doc.font("Helvetica-Bold").fontSize(30).fillColor(GOLD).text("KAYZAN", L + 70, y + 2, { characterSpacing: 3, lineBreak: false });
            doc.font("Helvetica").fontSize(12).fillColor(GOLD_DARK).text("GROUP", L + 72, y + 38, { characterSpacing: 9, lineBreak: false });
        }
        doc.save().lineWidth(1).strokeColor(GOLD_LINE).moveTo(300, y + 2).lineTo(300, y + 56).stroke().restore();
    }
    const titleX = letterhead ? L : 310;
    const titleW = letterhead ? W : R - 310;
    const titleAlign = letterhead ? "left" : "right";
    doc.font("Helvetica-Bold").fontSize(letterhead ? 22 : 28).fillColor(INK)
        .text("SALARY SLIP", titleX, y + (letterhead ? 0 : 2), { width: titleW, align: titleAlign, lineBreak: false });
    doc.font("Helvetica").fontSize(letterhead ? 12 : 14).fillColor(MUTED)
        .text(`Month: ${d.monthLabel}`, titleX, y + (letterhead ? 28 : 38), { width: titleW, align: titleAlign, lineBreak: false });
    if (d.periodRangeText) {
        doc.fontSize(8.5).fillColor(MUTED)
            .text(d.periodRangeText, titleX, y + (letterhead ? 46 : 58), { width: titleW, align: titleAlign, lineBreak: false });
    }
    y += letterhead ? 62 : 72;
    hRule(y);
    y += 8;

    // Employer line (legal entity the employee belongs to - the group header alone
    // doesn't say which company is paying).
    if (d.companyName) {
        doc.font("Helvetica").fontSize(8.5).fillColor(MUTED).text(`Employer: ${d.companyName}`, L, y, { width: W, lineBreak: false });
        y += 14;
    }

    // ---- Identity row
    fields.forEach(([label, value], i) => {
        const x = L + i * colW + (i === 0 ? 2 : 14);
        doc.font("Helvetica").fontSize(7.5).fillColor(MUTED).text(label, x, y + 4, { width: colW - 18, characterSpacing: 0.3, lineBreak: false });
        doc.font("Helvetica-Bold").fontSize(11.5).fillColor(INK).text(String(value), x, y + 17, { width: colW - 18 });
        if (i > 0) doc.save().lineWidth(0.7).strokeColor(GOLD_LINE).moveTo(L + i * colW, y + 2).lineTo(L + i * colW, y + fieldsH - 4).stroke().restore();
    });
    y += fieldsH + 4;
    hRule(y);
    y += gap;

    // ---- Attendance summary
    doc.font("Helvetica-Bold").fontSize(compact ? 13 : 15).fillColor(INK).text("Attendance Summary", L + 2, y, { lineBreak: false });
    y += attHeadH;
    hRule(y);
    const att = d.attendanceSummary || {};
    const attCols = [
        ["Total Days", att.totalDays || 30, INK],
        ["Present", att.daysPresent || 0, INK],
        ["Absent", att.daysAbsent || 0, RED]
    ];
    const attW = W / 3;
    attCols.forEach(([label, value, color], i) => {
        const x = L + i * attW + (i === 0 ? 14 : 28);
        doc.font("Helvetica").fontSize(10).fillColor(MUTED).text(label, x, y + 8, { lineBreak: false });
        doc.font("Helvetica-Bold").fontSize(compact ? 22 : 28).fillColor(color).text(String(value), x, y + 22, { lineBreak: false });
        if (i > 0) doc.save().lineWidth(0.7).strokeColor(GOLD_LINE).moveTo(L + i * attW, y + 8).lineTo(L + i * attW, y + (compact ? 48 : 58)).stroke().restore();
    });
    y += attBodyH;
    hRule(y);
    y += gap;

    // ---- Earnings | Deductions
    const colGap = 12;
    const tblW = (W - colGap) / 2;
    const leftX = L;
    const rightX = L + tblW + colGap;
    const drawTable = (x, title, items, totalLabel, totalValue) => {
        doc.rect(x, y, tblW, headH).fill(BEIGE);
        doc.font("Helvetica-Bold").fontSize(11).fillColor(GOLD_DARK).text(title, x + 8, y + 8, { lineBreak: false });
        doc.font("Helvetica-Bold").fontSize(8.5).fillColor(GOLD_DARK).text("AMOUNT (AED)", x, y + 9, { width: tblW - 8, align: "right", lineBreak: false });
        let ry = y + headH;
        for (let i = 0; i < rowCount; i++) {
            const item = items[i];
            if (item) {
                doc.font("Helvetica").fontSize(10).fillColor(INK)
                    .text(item.name || "", x + 8, ry + (rowH - 10) / 2 - 1, { width: tblW - 100, height: rowH - 4, ellipsis: true, lineBreak: false });
                doc.font("Helvetica").fontSize(10).fillColor(INK)
                    .text(payslipMoney(item.amount), x, ry + (rowH - 10) / 2 - 1, { width: tblW - 8, align: "right", lineBreak: false });
            }
            doc.save().lineWidth(0.6).strokeColor(ROW_LINE).moveTo(x, ry + rowH).lineTo(x + tblW, ry + rowH).stroke().restore();
            ry += rowH;
        }
        doc.rect(x, ry, tblW, headH + 2).fill(BEIGE_LIGHT);
        doc.font("Helvetica-Bold").fontSize(11.5).fillColor(INK).text(totalLabel, x + 8, ry + 9, { lineBreak: false });
        doc.font("Helvetica-Bold").fontSize(11.5).fillColor(INK).text(payslipMoney(totalValue), x, ry + 9, { width: tblW - 8, align: "right", lineBreak: false });
        doc.save().lineWidth(0.7).strokeColor(GOLD_LINE).rect(x, y, tblW, headH + rowCount * rowH + headH + 2).stroke().restore();
        return ry + headH + 2;
    };
    const leftEnd = drawTable(leftX, "EARNINGS", earnings, "Total Earnings", totalEarnings);
    drawTable(rightX, "DEDUCTIONS", deductions, "Total Deductions", totalDeductions);
    y = leftEnd + gap + 2;
    hRule(y);

    // ---- Net salary payable
    doc.font("Helvetica-Bold").fontSize(compact ? 16 : 19).fillColor(GOLD_DARK).text("NET SALARY PAYABLE", L + 4, y + (compact ? 12 : 16), { lineBreak: false });
    doc.font("Helvetica").fontSize(10.5).fillColor(MUTED).text("Final payout after deductions", L + 4, y + (compact ? 33 : 41), { lineBreak: false });
    doc.save().lineWidth(1).strokeColor(GOLD_LINE).moveTo(300, y + 10).lineTo(300, y + netH - 10).stroke().restore();
    doc.font("Helvetica-Bold").fontSize(compact ? 24 : 30).fillColor(GOLD_DARK)
        .text(`${payslipMoney(d.netSalary)} AED`, 310, y + (compact ? 16 : 20), { width: R - 310 - 4, align: "right", lineBreak: false });
    y += netH;
    hRule(y);
    y += gap;

    // ---- In words
    doc.rect(L, y, W, stripH).fill(BEIGE_LIGHT);
    doc.font("Helvetica-Bold").fontSize(12).fillColor(GOLD_DARK).text("In Words:", L + 12, y + (stripH - 12) / 2 - 1, { lineBreak: false });
    doc.font("Helvetica").fontSize(11).fillColor(INK).text(words, L + 88, y + (stripH - wordsH) / 2, { width: W - 100 });
    y += stripH;

    // ---- Signatures
    y += sigGap;
    doc.save().lineWidth(0.8).strokeColor("#374151");
    doc.moveTo(L + 26, y).lineTo(L + 196, y).stroke();
    doc.moveTo(R - 196, y).lineTo(R - 26, y).stroke();
    doc.restore();
    doc.font("Helvetica").fontSize(8.5).fillColor(MUTED);
    doc.text("EMPLOYEE SIGNATURE", L + 26, y + 6, { width: 170, align: "center", characterSpacing: 0.4, lineBreak: false });
    doc.text("EMPLOYER SIGNATURE", R - 196, y + 6, { width: 170, align: "center", characterSpacing: 0.4, lineBreak: false });
};

// Builds one payslip PDF (PDFKit content, optionally merged onto the Leptis
// Group letterhead via pdf-lib) and returns it as a Buffer - shared by the
// single-payslip download below and the bulk ZIP export, so there is exactly
// one place that draws a payslip. `payroll` must have `.employee` populated
// with at least name/code/designation/department/company (same shape the
// single-download query below fetches). `brandingCache` is a Map the caller
// owns - pass a fresh one for a single call, or one shared Map across a loop.
const buildPayslipPdfBuffer = async (payroll, brandingCache) => {
        const { employee, basicSalary, allowances, deductions, netSalary, attendanceSummary, month, year, periodStart, periodEnd } = payroll;
        const companyName = employee?.company || process.env.COMPANY_NAME || "Company";
        const { companyLogoBuffer, companyLogoPath, isLeptisCompany } = await resolveCompanyBranding(companyName, brandingCache);
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
        const rows = buildPayslipRows(payroll);

        // Margin-less doc: every element is positioned absolutely by drawKayzanPayslip,
        // so PDFKit must not auto-insert pages when text lands near the bottom edge.
        const doc = new PDFDocument({ size: "A4", margin: 0 });
        const buffers = [];
        doc.on("data", buffers.push.bind(buffers));
        const docEndPromise = new Promise((resolve) => {
            doc.on("end", () => resolve(Buffer.concat(buffers)));
        });

        drawKayzanPayslip(doc, {
            employee,
            // Header shows the employee's own company logo (Kayzan mark only as fallback).
            companyName: employee?.company || "",
            companyLogoBuffer,
            companyLogoPath,
            attendanceSummary,
            netSalary,
            rows,
            monthLabel: new Date(year, month - 1).toLocaleString("en-US", { month: "short" }) + ` ${year}`,
            periodRangeText: (!periodsSpanOneMonth && periodStart && periodEnd) ? periodStr : "",
            isLeptisCompany
        });
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
        const templatePath = path.join(__dirname, "../assets/templates/Letter_Head_-_Group_2023.pdf");

        // Non-Leptis companies (or if the template file is missing) get the plain content PDF.
        if (!isLeptisCompany || !fs.existsSync(templatePath)) {
            return contentPdfBuffer;
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
        return Buffer.from(pdfBytes);
};

// Single payslip PDF download - self-service (employee downloading their own)
// and admin/HR (downloading any employee's). No status gate here deliberately
// (unlike getMyPayslips' PROCESSED-only filter) - once you have the id, a
// DRAFT payslip can be previewed too.
export const downloadPayslip = async (req, res) => {
    try {
        const { id } = req.params;
        const payroll = await Payroll.findById(id).populate("employee", PAYSLIP_EMPLOYEE_FIELDS);

        if (!payroll) {
            return res.status(404).json({ message: "Payslip not found" });
        }

        // Admin / HR / ALL / payroll managers may open any payslip; everyone else only
        // their own. (This used to waive only role === "Admin" - an HR user with a linked
        // employee record was 403'd on others' payslips, while a non-admin user with NO
        // employee link skipped the check entirely.)
        const canViewAnyPayslip = req.user.role === "Admin"
            || /^HR/i.test(req.user.role || "")
            || req.user.permissions?.includes("ALL")
            || req.user.permissions?.includes("MANAGE_PAYROLL");
        if (!canViewAnyPayslip) {
            const ownEmployeeId = req.user.employeeId?.toString();
            if (!ownEmployeeId || payroll.employee?._id?.toString() !== ownEmployeeId) {
                return res.status(403).json({ message: "Unauthorized access to this payslip" });
            }
        }

        const pdfBuffer = await buildPayslipPdfBuffer(payroll, new Map());
        const monthName = new Date(payroll.year, payroll.month - 1).toLocaleString('default', { month: 'long' });

        res.setHeader("Content-Type", "application/pdf");
        const disposition = req.query.inline === "1" ? "inline" : "attachment";
        res.setHeader("Content-Disposition", `${disposition}; filename="Payslip_${monthName}_${payroll.year}.pdf"`);
        res.send(pdfBuffer);
    } catch (error) {
        // console.error(error);
        res.status(500).json({ message: "PDF Generation Failed: " + error.message });
    }
};

// Bulk payslip export - one ZIP containing every PROCESSED employee's payslip
// PDF for a period, available once Finalize has run.
//
// This used to be a single synchronous request: query, build every PDF, zip,
// send. Confirmed failing in production with an nginx 504 Gateway Time-out -
// building N PDFs (each with its own S3 logo fetch on a cache miss) can run
// long enough on a real company's headcount that the reverse proxy kills the
// connection before the response finishes (same failure mode already fixed
// for the DB backup - see backupController.js's identical comment). A bounded-
// concurrency loop alone only shaves time off; it doesn't remove the ceiling.
// Split into start/status/download so the client never holds one long-lived
// request open - the job keeps running server-side regardless.
export const startPayslipExport = async (req, res) => {
    try {
        const { month, year, periodStart, periodEnd } = req.query;

        // month is optional - the UI's "All months" option omits it, meaning
        // "every finalized month in this year", not a single period.
        const query = { status: "PROCESSED" };
        if (periodStart && periodEnd) {
            query.periodStart = toDayStart(periodStart);
            query.periodEnd = toDayEnd(periodEnd);
        } else if (year) {
            query.year = Number(year);
            if (month) query.month = Number(month);
        } else {
            return res.status(400).json({ message: "year (or periodStart and periodEnd) is required." });
        }

        // Cheap existence check up front - a genuinely empty period should 404
        // immediately, not spin up a job that would just fail a moment later.
        const recordCount = await Payroll.countDocuments(query);
        if (recordCount === 0) {
            const message = (month && !periodStart)
                ? "There is no payroll for this particular month."
                : "No finalized payroll records found for this period. Payslips can only be exported after Finalize.";
            return res.status(404).json({ message });
        }

        const job = await PayslipExportJob.create({
            status: "pending",
            requestedBy: req.user?._id,
            requestedByName: req.user?.name,
            month: month ? Number(month) : undefined,
            year: year ? Number(year) : undefined,
            periodStart: periodStart ? toDayStart(periodStart) : undefined,
            periodEnd: periodEnd ? toDayEnd(periodEnd) : undefined
        });

        res.status(202).json({ jobId: job._id, status: "pending" });

        // Fire-and-forget: runs after the response is already sent, fully
        // decoupled from this request/response cycle.
        setImmediate(() => runPayslipExportJob(job._id, query, { month, year, periodStart, periodEnd }));
    } catch (error) {
        res.status(500).json({ message: "Failed to start payslip export: " + error.message });
    }
};

async function runPayslipExportJob(jobId, query, rawParams) {
    const { month, year, periodStart, periodEnd } = rawParams;
    try {
        await PayslipExportJob.findByIdAndUpdate(jobId, { status: "running", startedAt: new Date() });

        const records = await Payroll.find(query).populate("employee", PAYSLIP_EMPLOYEE_FIELDS);

        const brandingCache = new Map();
        const zipEntries = [];
        const failures = [];

        // Bounded concurrency - one PDF (each with its own S3 logo fetch, on a
        // cache miss) at a time was needlessly slow for a large batch; this
        // doesn't remove the timeout risk on its own (that's what the job
        // split above is for) but still keeps the job itself fast.
        const CONCURRENCY = 5;
        let nextIndex = 0;
        const worker = async () => {
            while (true) {
                const i = nextIndex++;
                if (i >= records.length) return;
                const record = records[i];
                try {
                    const pdfBuffer = await buildPayslipPdfBuffer(record, brandingCache);
                    const safeCode = String(record.employee?.code || record.employee?._id || "employee").replace(/[^a-z0-9_-]+/gi, "_");
                    const monthName = new Date(record.year, record.month - 1).toLocaleString('default', { month: 'long' });
                    zipEntries.push({ name: `Payslip_${safeCode}_${monthName}_${record.year}.pdf`, content: pdfBuffer });
                } catch (buildError) {
                    failures.push({ employeeCode: record.employee?.code, employeeName: record.employee?.name, error: buildError.message });
                }
            }
        };
        await Promise.all(Array.from({ length: Math.min(CONCURRENCY, records.length) }, worker));

        if (zipEntries.length === 0) {
            await PayslipExportJob.findByIdAndUpdate(jobId, {
                status: "failed",
                error: "Failed to build any payslips for this period.",
                completedAt: new Date()
            });
            return;
        }

        const archive = buildZipArchive(zipEntries);

        const filenamePeriod = periodStart && periodEnd
            ? `${periodStart}_${periodEnd}`
            : (month ? `${month}_${year}` : `All_${year}`);
        const fileName = `Payslips_${filenamePeriod}.zip`;

        const stored = await storeUploadedFile({
            file: { buffer: archive, mimetype: "application/zip", originalname: fileName },
            folder: "payslip-exports",
            preferS3: true
        });

        await PayslipExportJob.findByIdAndUpdate(jobId, {
            status: "ready",
            s3Key: stored.filePath,
            fileName,
            fileSize: archive.length,
            employeeCount: zipEntries.length,
            skippedCount: failures.length,
            completedAt: new Date()
        });

        PayrollAudit.create({
            action: "PAYSLIPS_EXPORTED",
            month: month ? Number(month) : records[0]?.month,
            year: year ? Number(year) : records[0]?.year,
            details: `Exported ${zipEntries.length} payslip(s) as ZIP${failures.length ? `, ${failures.length} skipped` : ""}`
        }).catch(console.error);
    } catch (error) {
        console.error("[payrollController] Payslip export job failed:", error);
        // Double-guarded, same as backupController.js's runBackupJob - a Mongo
        // hiccup while recording the failure itself must never leave the job
        // silently stuck in "running" forever, and must never throw inside a
        // setImmediate callback (unhandled rejection would crash the process).
        await PayslipExportJob.findByIdAndUpdate(jobId, {
            status: "failed",
            error: error.message,
            completedAt: new Date()
        }).catch(() => {});
    }
}

export const getPayslipExportStatus = async (req, res) => {
    try {
        const job = await PayslipExportJob.findById(req.params.jobId);
        if (!job) return res.status(404).json({ message: "Export job not found" });

        res.json({
            jobId: job._id,
            status: job.status,
            employeeCount: job.employeeCount,
            skippedCount: job.skippedCount,
            fileSize: job.fileSize,
            error: job.error
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch export status: " + error.message });
    }
};

export const downloadPayslipExportFile = async (req, res) => {
    try {
        const job = await PayslipExportJob.findById(req.params.jobId);
        if (!job) return res.status(404).json({ message: "Export job not found" });
        if (job.status !== "ready") return res.status(409).json({ message: "Export is not ready yet" });

        // Return the URL as JSON, not a redirect - see backupController.js's
        // downloadBackupFile for why (bucket CORS would otherwise need to
        // allowlist whatever origin calls this via fetch/XHR).
        const url = await getSignedFileUrl({
            filePath: job.s3Key,
            storage: "S3",
            expiresIn: 300,
            downloadFilename: job.fileName
        });
        res.json({ url });
    } catch (error) {
        res.status(500).json({ message: "Failed to generate download link: " + error.message });
    }
};
