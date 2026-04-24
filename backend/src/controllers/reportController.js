import * as reportService from "../services/reportService.js";
import * as XLSX from "xlsx";
import ReportSchedule from "../models/reportScheduleModel.js";
import CustomReport from "../models/customReportModel.js";
import ReportActivity from "../models/reportActivityModel.js";
import Request from "../models/requestModel.js";
import Appraisal from "../models/appraisalModel.js";
import AppraisalCycle from "../models/appraisalCycleModel.js";
import Employee from "../models/employeeModel.js";
import User from "../models/userModel.js";

const logActivity = async (type, reportName) => {
  try {
    await ReportActivity.create({ type, reportName });
  } catch (error) {
    // console.error(`Activity Logging Error (${type} - ${reportName}):`, error);
  }
};

const sendExcelResponse = (res, data, fileName, sheetName) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

  res.setHeader("Content-Disposition", `attachment; filename="${fileName}.xlsx"`);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.send(buffer);
};

export const getDepartmentAttendanceReport = async (req, res) => {
  try {
    const month = parseInt(req.query.month);
    const year = parseInt(req.query.year);
    const isExport = req.query.export === "true";

    if (!month || !year) {
      return res.status(400).json({ success: false, message: "Month and year are required" });
    }

    const data = await reportService.getDepartmentAttendance(month, year);

    if (isExport) {
      await logActivity("Export", "Department Attendance");
      return sendExcelResponse(res, data, `Attendance_${month}_${year}`, "Attendance");
    }

    await logActivity("Generation", "Department Attendance");
    res.status(200).json({ success: true, data });
  } catch (error) {
    // console.error("Departmental Attendance Report Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getDailyDepartmentAttendanceReport = async (req, res) => {
  try {
    const { date } = req.query;
    const isExport = req.query.export === "true";

    if (!date) {
      return res.status(400).json({ success: false, message: "Date is required" });
    }

    const data = await reportService.getDailyDepartmentAttendance(date);

    if (isExport) {
      await logActivity("Export", "Daily Attendance");
      return sendExcelResponse(res, data, `Attendance_${date}`, "Daily Attendance");
    }

    await logActivity("Generation", "Daily Attendance");
    res.status(200).json({ success: true, data });
  } catch (error) {
    // console.error("Daily Departmental Attendance Report Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getDocumentExpiryReport = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const isExport = req.query.export === "true";
    const data = await reportService.getDocumentExpiryForecast(days);

    if (isExport) {
      const exportData = data.map(item => ({
        "Employee Name": item.name,
        "Employee Code": item.employeeCode,
        "Document Type": item.documentType,
        "Document Number": item.documentNumber,
        "Expiry Date": new Date(item.expiryDate).toLocaleDateString(),
        "Days to Expiry": item.daysToExpiry
      }));
      await logActivity("Export", "Document Expiry");
      return sendExcelResponse(res, exportData, `Document_Expiry_Forecast_${days}_days`, "Expiries");
    }

    await logActivity("Generation", "Document Expiry");
    res.status(200).json({ success: true, data });
  } catch (error) {
    // console.error("Document Expiry Report Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getAssetDepreciationReport = async (req, res) => {
  try {
    const isExport = req.query.export === "true";
    const data = await reportService.getAssetDepreciationReport();

    if (isExport) {
      const exportData = data.map(item => ({
        "Asset Name": item.assetName,
        "Asset Code": item.assetCode,
        "Purchase Cost": item.purchaseCost,
        "Purchase Date": new Date(item.purchaseDate).toLocaleDateString(),
        "Age (Months)": item.ageInMonths,
        "Monthly Dep.": item.monthlyDepreciation,
        "Total Dep.": item.totalDepreciation,
        "Current Value": item.currentValue
      }));
      await logActivity("Export", "Asset Depreciation");
      return sendExcelResponse(res, exportData, "Asset_Depreciation_Report", "Depreciation");
    }

    await logActivity("Generation", "Asset Depreciation");
    res.status(200).json({ success: true, data });
  } catch (error) {
    // console.error("Asset Depreciation Report Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getPayrollSummaryReport = async (req, res) => {
  try {
    const { month, year } = req.query;
    const isExport = req.query.export === "true";

    if (!month || !year) {
      return res.status(400).json({ success: false, message: "Month and year are required" });
    }
    const data = await reportService.getPayrollSummary(month, year);

    if (isExport) {
      const exportData = data.map(item => ({
        "Employee Name": item.name,
        "Employee Code": item.employeeCode,
        "Basic Salary": item.basicSalary,
        "Total Allowances": item.totalAllowances,
        "Total Deductions": item.totalDeductions,
        "Net Salary": item.netSalary,
        "Status": item.status
      }));
      await logActivity("Export", "Payroll Summary");
      return sendExcelResponse(res, exportData, `Payroll_Summary_${month}_${year}`, "Payroll Summary");
    }

    await logActivity("Generation", "Payroll Summary");
    res.status(200).json({ success: true, data });
  } catch (error) {
    // console.error("Payroll Summary Report Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getBranchWiseEmployeeReport = async (req, res) => {
  try {
    const {
      branch,
      company,
      department,
      status,
      search,
      page = 1,
      limit = 10
    } = req.query;
    const isExport = req.query.export === "true";

    const result = await reportService.getBranchWiseEmployeeReport({
      branch,
      company,
      department,
      status,
      search,
      page,
      limit: isExport ? 5000 : limit
    });

    if (isExport) {
      const exportData = result.rows.map((item) => ({
        "Employee Code": item.code,
        "Employee Name": item.name,
        "Company": item.company || "—",
        "Branch": item.branch || "—",
        "Department": item.department || "—",
        "Designation": item.designation || "—",
        "Role": item.role || "—",
        "Status": item.status || "—",
        "Joining Date": item.joinDate ? new Date(item.joinDate).toLocaleDateString() : "—",
        "Visa Base": item.visaBase || 0,
        "Work Base": item.workBase || 0,
        "Email": item.email || "—",
        "Phone": item.phone || "—"
      }));
      await logActivity("Export", "Branch Wise Employee Report");
      return sendExcelResponse(res, exportData, "Branch_Wise_Employee_Report", "Branch Employees");
    }

    await logActivity("Generation", "Branch Wise Employee Report");
    return res.status(200).json({
      success: true,
      data: result.rows,
      pagination: result.pagination,
      summary: result.summary
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const generateCustomReport = async (req, res) => {
  try {
    const { dataset, columns, filters, export: isExport } = req.body;

    if (!dataset || !columns || !columns.length) {
      return res.status(400).json({ success: false, message: "Dataset and columns are required" });
    }

    const data = await reportService.getCustomReport(dataset, columns, filters);

    if (isExport) {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Custom Report");
      const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      await logActivity("Export", `Custom Report (${dataset})`);
      return res.send(buffer);
    }

    await logActivity("Generation", `Custom Report (${dataset})`);
    res.status(200).json({ success: true, data });
  } catch (error) {
    // console.error("Custom Report Generation Error:", error);
    res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

// --- SCHEDULED REPORTS CRUD ---

export const getSchedules = async (req, res) => {
  try {
    let schedules = await ReportSchedule.find();

    // Seed if empty (matches client requirement from image)
    if (schedules.length === 0) {
      await ReportSchedule.insertMany([
        { title: "Daily Attendance Report", description: "Sent daily at 6:00 PM to HR Team", frequency: "Daily", recipient: "HR Team", status: "Active" },
        { title: "Monthly Payroll Summary", description: "Sent 1st of each month to Finance Department", frequency: "Monthly", recipient: "Finance Department", status: "Active" },
        { title: "Document Expiry Alerts", description: "Sent weekly on Monday to Admin Team", frequency: "Weekly", recipient: "Admin Team", status: "Active" }
      ]);
      schedules = await ReportSchedule.find();
    }

    res.status(200).json({ success: true, data: schedules });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching schedules" });
  }
};

export const createSchedule = async (req, res) => {
  try {
    const newSchedule = await ReportSchedule.create(req.body);
    res.status(201).json({ success: true, data: newSchedule });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error creating schedule" });
  }
};

export const updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await ReportSchedule.findByIdAndUpdate(id, req.body, { new: true });
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating schedule" });
  }
};

export const deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    await ReportSchedule.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: "Schedule deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting schedule" });
  }
};

// --- CUSTOM REPORT CONFIGS ---

export const getCustomConfigs = async (req, res) => {
  try {
    let configs = await CustomReport.find().sort({ updatedAt: -1 });

    // Seed if empty (matches Figma reference)
    if (configs.length === 0) {
      await CustomReport.insertMany([
        { title: "Sales Team Performance - Q4 2025", dataset: "Payroll", columns: ["employee.name", "netSalary", "totalAllowances"], filters: {} },
        { title: "Asset Allocation by Department", dataset: "Assets", columns: ["name", "assetCode", "category", "location"], filters: {} }
      ]);
      configs = await CustomReport.find().sort({ updatedAt: -1 });
    }

    res.status(200).json({ success: true, data: configs });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching custom configs" });
  }
};

export const saveCustomConfig = async (req, res) => {
  try {
    const config = await CustomReport.create(req.body);
    res.status(201).json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error saving report configuration" });
  }
};

export const updateCustomConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await CustomReport.findByIdAndUpdate(id, { ...req.body, lastRun: Date.now() }, { new: true });
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating report configuration" });
  }
};

export const deleteCustomConfig = async (req, res) => {
  try {
    const { id } = req.params;
    await CustomReport.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: "Report deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting report configuration" });
  }
};

export const getReportStats = async (req, res) => {
  try {
    const totalReportsGenerated = await ReportActivity.countDocuments({ type: "Generation" });
    const totalExports = await ReportActivity.countDocuments({ type: "Export" });
    const activeSchedules = await ReportSchedule.countDocuments({ status: "Active" });
    const customReportsCount = await CustomReport.countDocuments();

    // Growth metrics (mock logic for demo if no history, otherwise calculate by month)
    const now = new Date();
    const firstOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const generatedThisMonth = await ReportActivity.countDocuments({ type: "Generation", timestamp: { $gte: firstOfCurrentMonth } });
    const exportsThisMonth = await ReportActivity.countDocuments({ type: "Export", timestamp: { $gte: firstOfCurrentMonth } });
    const schedulesThisMonth = await ReportSchedule.countDocuments({ createdAt: { $gte: firstOfLastMonth } }); // Simplified growth tracker
    const customThisMonth = await CustomReport.countDocuments({ createdAt: { $gte: firstOfLastMonth } });

    res.status(200).json({
      success: true,
      data: [
        { title: "Reports Generated", value: totalReportsGenerated, change: `+${generatedThisMonth}`, icon: "reports" },
        { title: "Active Schedules", value: activeSchedules, change: `+${schedulesThisMonth}`, icon: "calendar" },
        { title: "Custom Reports", value: customReportsCount, change: `+${customThisMonth}`, icon: "document" },
        { title: "Total Exports", value: totalExports, change: `+${exportsThisMonth}`, icon: "download" }
      ]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error calculating stats" });
  }
};

export const logManualActivity = async (req, res) => {
  try {
    const { type, reportName } = req.body;
    await logActivity(type, reportName);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error logging activity" });
  }
};

// ─── LOAN REPORT ────────────────────────────────────────────────────────────

export const getLoanReport = async (req, res) => {
  try {
    const { status, subType, startDate, endDate } = req.query;
    const isExport = req.query.export === "true";

    const filter = { requestType: "SALARY" };
    if (status) filter.status = status;
    if (subType) filter["details.subType"] = subType;
    if (startDate || endDate) {
      filter.submittedAt = {};
      if (startDate) filter.submittedAt.$gte = new Date(startDate);
      if (endDate) filter.submittedAt.$lte = new Date(endDate);
    }

    const requests = await Request.find(filter)
      .populate("userId", "name employeeId")
      .populate("approvedBy", "name")
      .sort({ submittedAt: -1 });

    // Resolve employee details
    const employeeIds = requests
      .map((r) => r.userId?.employeeId)
      .filter(Boolean);
    const employees = await Employee.find({ _id: { $in: employeeIds } })
      .select("_id code department branch");
    const empMap = {};
    employees.forEach((e) => { empMap[e._id.toString()] = e; });

    const data = requests.map((r) => {
      const empId = r.userId?.employeeId?.toString();
      const emp = empMap[empId] || {};
      const amount = Number(r.details?.amount) || 0;
      const repaymentPeriod = Number(r.details?.repaymentPeriod) || 1;
      const monthlyInstallment = repaymentPeriod > 0 ? (amount / repaymentPeriod) : amount;
      const totalPaid = (r.payrollDeductions || []).reduce((acc, d) => acc + Number(d.amount || 0), 0);
      const outstanding = Math.max(0, amount - totalPaid);
      const loanType = r.details?.subType === "loan" ? "Loan" : "Salary Advance";

      return {
        employeeId: emp.code || r.userId?.employeeId || "N/A",
        employeeName: r.userId?.name || "N/A",
        department: emp.department || "N/A",
        branch: emp.branch || "N/A",
        loanId: r.requestId,
        loanType,
        loanDate: r.approvedAt ? new Date(r.approvedAt).toLocaleDateString() : "N/A",
        loanAmount: amount,
        repaymentPeriod,
        monthlyInstallment: parseFloat(monthlyInstallment.toFixed(2)),
        totalPaid: parseFloat(totalPaid.toFixed(2)),
        outstandingBalance: parseFloat(outstanding.toFixed(2)),
        status: r.isFullyPaid ? "Paid Off" : r.status,
        approvedBy: r.approvedBy?.name || "N/A"
      };
    });

    if (isExport) {
      const exportData = data.map((d) => ({
        "Employee ID": d.employeeId,
        "Employee Name": d.employeeName,
        "Department": d.department,
        "Branch": d.branch,
        "Loan ID": d.loanId,
        "Loan Type": d.loanType,
        "Loan Date": d.loanDate,
        "Loan Amount (AED)": d.loanAmount,
        "Repayment Period (Months)": d.repaymentPeriod,
        "Monthly Installment (AED)": d.monthlyInstallment,
        "Total Paid (AED)": d.totalPaid,
        "Outstanding Balance (AED)": d.outstandingBalance,
        "Status": d.status,
        "Approved By": d.approvedBy
      }));
      await logActivity("Export", "Loan Report");
      return sendExcelResponse(res, exportData, "Loan_Report", "Loans");
    }

    await logActivity("Generation", "Loan Report");
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// ─── APPRAISAL REPORT ────────────────────────────────────────────────────────

export const getAppraisalReport = async (req, res) => {
  try {
    const { cycleId, status, startDate, endDate } = req.query;
    const isExport = req.query.export === "true";

    const filter = {};
    if (cycleId) filter.cycle = cycleId;
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.effectiveDate = {};
      if (startDate) filter.effectiveDate.$gte = new Date(startDate);
      if (endDate) filter.effectiveDate.$lte = new Date(endDate);
    }

    const appraisals = await Appraisal.find(filter)
      .populate("employee", "name code department branch")
      .populate("cycle", "name startDate endDate")
      .populate("createdBy", "name")
      .populate("approvedBy", "name")
      .sort({ effectiveDate: -1 });

    const data = appraisals.map((a) => ({
      employeeId: a.employee?.code || "N/A",
      employeeName: a.employee?.name || "N/A",
      department: a.employee?.department || "N/A",
      branch: a.employee?.branch || "N/A",
      cycleName: a.cycle?.name || "N/A",
      currentSalary: a.currentSalary || 0,
      recommendedIncrement: a.recommendedIncrement || 0,
      approvedIncrement: a.approvedIncrement || 0,
      newSalary: (a.currentSalary || 0) + (a.approvedIncrement || 0),
      effectiveDate: a.effectiveDate ? new Date(a.effectiveDate).toLocaleDateString() : "N/A",
      status: a.status,
      comments: a.comments || "",
      approvedBy: a.approvedBy?.name || "N/A"
    }));

    if (isExport) {
      const exportData = data.map((d) => ({
        "Employee ID": d.employeeId,
        "Employee Name": d.employeeName,
        "Department": d.department,
        "Branch": d.branch,
        "Appraisal Cycle": d.cycleName,
        "Current Salary (AED)": d.currentSalary,
        "Recommended Increment (AED)": d.recommendedIncrement,
        "Approved Increment (AED)": d.approvedIncrement,
        "New Salary (AED)": d.newSalary,
        "Effective Date": d.effectiveDate,
        "Status": d.status,
        "Comments": d.comments,
        "Approved By": d.approvedBy
      }));
      await logActivity("Export", "Appraisal Report");
      return sendExcelResponse(res, exportData, "Appraisal_Report", "Appraisals");
    }

    await logActivity("Generation", "Appraisal Report");
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
