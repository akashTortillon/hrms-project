import * as reportService from "../services/reportService.js";
import * as XLSX from "xlsx";
import ReportSchedule from "../models/reportScheduleModel.js";
import CustomReport from "../models/customReportModel.js";
import ReportActivity from "../models/reportActivityModel.js";

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
