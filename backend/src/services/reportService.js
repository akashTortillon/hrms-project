// backend/services/reportService.js
import Attendance from "../models/attendanceModel.js";
import Employee from "../models/employeeModel.js";
import Asset from "../models/assetModel.js";
import EmployeeDocument from "../models/employeeDocumentModel.js";
import CompanyDocument from "../models/companyDocModel.js";
import Payroll from "../models/payrollModel.js";
import Master from "../models/masterModel.js";

/**
 * Get Departmental Attendance Report (Monthly)
 */
export const getDepartmentAttendance = async (month, year) => {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);

  const data = await Attendance.aggregate([
    {
      $match: {
        date: { $gte: start.toISOString().split("T")[0], $lte: end.toISOString().split("T")[0] },
      },
    },
    {
      $lookup: {
        from: "employees",
        localField: "employee",
        foreignField: "_id",
        as: "employee",
      },
    },
    { $unwind: "$employee" },
    {
      $group: {
        _id: "$employee.department",
        totalEmployees: { $addToSet: "$employee._id" },
        present: { $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] } },
        absent: { $sum: { $cond: [{ $eq: ["$status", "Absent"] }, 1, 0] } },
        late: { $sum: { $cond: [{ $eq: ["$status", "Late"] }, 1, 0] } },
        onLeave: { $sum: { $cond: [{ $eq: ["$status", "On Leave"] }, 1, 0] } },
      },
    },
    {
      $project: {
        _id: 0,
        department: "$_id",
        totalEmployees: { $size: "$totalEmployees" },
        present: 1,
        absent: 1,
        late: 1,
        onLeave: 1,
      },
    },
    { $sort: { department: 1 } },
  ]);

  return data;
};

/**
 * Get Daily Departmental Attendance Report
 */
export const getDailyDepartmentAttendance = async (date) => {
  const data = await Attendance.aggregate([
    {
      $match: { date: date },
    },
    {
      $lookup: {
        from: "employees",
        localField: "employee",
        foreignField: "_id",
        as: "employee",
      },
    },
    { $unwind: "$employee" },
    {
      $group: {
        _id: "$employee.department",
        totalEmployees: { $addToSet: "$employee._id" },
        present: { $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] } },
        absent: { $sum: { $cond: [{ $eq: ["$status", "Absent"] }, 1, 0] } },
        late: { $sum: { $cond: [{ $eq: ["$status", "Late"] }, 1, 0] } },
        onLeave: { $sum: { $cond: [{ $eq: ["$status", "On Leave"] }, 1, 0] } },
      },
    },
    {
      $project: {
        _id: 0,
        department: "$_id",
        totalEmployees: { $size: "$totalEmployees" },
        present: 1,
        absent: 1,
        late: 1,
        onLeave: 1,
      },
    },
    { $sort: { department: 1 } },
  ]);

  return data;
};

/**
 * Get Document Expiry Forecast
 */
export const getDocumentExpiryForecast = async (days = 30) => {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + days);

  const empDocs = await EmployeeDocument.find({
    expiryDate: { $lte: thresholdDate, $gte: new Date() }
  }).populate("employeeId", "name code department");

  const compDocs = await CompanyDocument.find({
    expiryDate: { $lte: thresholdDate, $gte: new Date() }
  });

  const results = [
    ...empDocs.map(d => ({
      type: "Employee",
      owner: d.employeeId?.name || "Unknown",
      docType: d.documentType,
      expiryDate: d.expiryDate,
      daysRemaining: Math.ceil((d.expiryDate - new Date()) / (1000 * 60 * 60 * 24))
    })),
    ...compDocs.map(d => ({
      type: "Company",
      owner: "Company",
      docType: d.type,
      expiryDate: d.expiryDate,
      daysRemaining: Math.ceil((d.expiryDate - new Date()) / (1000 * 60 * 60 * 24))
    }))
  ];

  return results.sort((a, b) => a.expiryDate - b.expiryDate);
};

/**
 * Get Asset Depreciation Report
 */
export const getAssetDepreciationReport = async () => {
  // We assume straight-line depreciation for simplicity unless metadata exists
  // Useful life defaults: IT (3 years), Furniture (5 years), Machinery (7 years)
  const assets = await Asset.find({ isDeleted: false, status: { $ne: "Disposed" } });

  // Get Asset Categories to find depreciation rates
  const categories = await Master.find({ type: "ASSET_CATEGORY" });
  const categoryMap = {};
  categories.forEach(c => {
    categoryMap[c.name] = c.metadata?.usefulLife || 5; // Default 5 years
  });

  const report = assets.map(asset => {
    const usefulLife = categoryMap[asset.category] || 5;
    const purchaseDate = new Date(asset.purchaseDate);
    const today = new Date();
    const ageInYears = (today - purchaseDate) / (1000 * 60 * 60 * 24 * 365);

    const annualDepreciation = asset.purchaseCost / usefulLife;
    let accumulatedDepreciation = annualDepreciation * ageInYears;

    if (accumulatedDepreciation > asset.purchaseCost) {
      accumulatedDepreciation = asset.purchaseCost;
    }

    const netBookValue = Math.max(0, asset.purchaseCost - accumulatedDepreciation);

    return {
      assetCode: asset.assetCode,
      name: asset.name,
      category: asset.category,
      purchaseDate: asset.purchaseDate,
      purchaseCost: asset.purchaseCost,
      usefulLife: usefulLife,
      annualDepreciation: annualDepreciation.toFixed(2),
      accumulatedDepreciation: accumulatedDepreciation.toFixed(2),
      netBookValue: netBookValue.toFixed(2)
    };
  });

  return report;
};

/**
 * Get Payroll Summary Report
 */
export const getPayrollSummary = async (month, year) => {
  const summary = await Payroll.aggregate([
    { $match: { month: parseInt(month), year: parseInt(year) } },
    {
      $lookup: {
        from: "employees",
        localField: "employee",
        foreignField: "_id",
        as: "emp"
      }
    },
    { $unwind: "$emp" },
    {
      $group: {
        _id: "$emp.department",
        totalBasic: { $sum: "$basicSalary" },
        totalAllowances: { $sum: "$totalAllowances" },
        totalDeductions: { $sum: "$totalDeductions" },
        totalNet: { $sum: "$netSalary" },
        employeeCount: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 0,
        department: "$_id",
        totalBasic: 1,
        totalAllowances: 1,
        totalDeductions: 1,
        totalNet: 1,
        employeeCount: 1
      }
    },
    { $sort: { department: 1 } }
  ]);

  return summary;
};

/**
 * Generic Custom Report Builder logic
 */
export const getCustomReport = async (dataset, columns = [], filters = {}) => {
  let model;
  let populate = null;

  switch (dataset) {
    case "Employees":
      model = Employee;
      break;
    case "Assets":
      model = Asset;
      break;
    case "Attendance":
      model = Attendance;
      populate = { path: "employee", select: "name code department" };
      break;
    case "Payroll":
      model = Payroll;
      populate = { path: "employee", select: "name code department" };
      break;
    default:
      throw new Error("Invalid dataset");
  }

  let query = model.find(filters);
  if (populate) query = query.populate(populate);

  const rawData = await query.lean();

  // Map columns (simplified projection)
  const processedData = rawData.map(item => {
    const row = {};
    columns.forEach(col => {
      // Handle nested fields (e.g., employee.name)
      if (col.includes(".")) {
        const parts = col.split(".");
        let val = item;
        parts.forEach(p => val = val?.[p]);
        row[col] = val || "N/A";
      } else {
        row[col] = item[col] || "N/A";
      }
    });
    return row;
  });

  return processedData;
};
