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

export const getBranchWiseEmployeeReport = async ({
  branch,
  company,
  department,
  status,
  search,
  page = 1,
  limit = 10
} = {}) => {
  const query = {};

  if (branch && branch !== "All Branches") query.branch = branch;
  if (company && company !== "All Companies") query.company = company;
  if (department && department !== "All Departments") query.department = department;
  if (status && status !== "All Status") query.status = status;
  if (search) {
    const regex = new RegExp(search, "i");
    query.$or = [
      { name: regex },
      { code: regex },
      { email: regex },
      { designation: regex }
    ];
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Number(limit) || 10);
  const skip = (pageNum - 1) * limitNum;

  const [total, rows, totals] = await Promise.all([
    Employee.countDocuments(query),
    Employee.find(query)
      .sort({ branch: 1, company: 1, name: 1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Employee.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalEmployees: { $sum: 1 },
          activeEmployees: {
            $sum: { $cond: [{ $eq: ["$status", "Active"] }, 1, 0] }
          },
          onboardingEmployees: {
            $sum: { $cond: [{ $eq: ["$status", "Onboarding"] }, 1, 0] }
          },
          uniqueBranches: { $addToSet: "$branch" },
          uniqueDepartments: { $addToSet: "$department" }
        }
      },
      {
        $project: {
          _id: 0,
          totalEmployees: 1,
          activeEmployees: 1,
          onboardingEmployees: 1,
          branchCount: {
            $size: {
              $filter: {
                input: "$uniqueBranches",
                as: "branchName",
                cond: { $and: [{ $ne: ["$$branchName", null] }, { $ne: ["$$branchName", ""] }] }
              }
            }
          },
          departmentCount: {
            $size: {
              $filter: {
                input: "$uniqueDepartments",
                as: "deptName",
                cond: { $and: [{ $ne: ["$$deptName", null] }, { $ne: ["$$deptName", ""] }] }
              }
            }
          }
        }
      }
    ])
  ]);

  return {
    rows,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum)
    },
    summary: totals[0] || {
      totalEmployees: 0,
      activeEmployees: 0,
      onboardingEmployees: 0,
      branchCount: 0,
      departmentCount: 0
    }
  };
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

// ─── 1. ATTENDANCE REPORT (per-employee) ─────────────────────────────────────
export const getAttendanceReport = async ({ month, year, branch, department, company, employeeId } = {}) => {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  // Build employee filter
  const empFilter = {};
  if (branch && branch !== "All Branches") empFilter.branch = branch;
  if (department && department !== "All Departments") empFilter.department = department;
  if (company && company !== "All Companies") empFilter.company = company;
  if (employeeId) empFilter._id = new (await import("mongoose")).default.Types.ObjectId(employeeId);

  const employees = await Employee.find(empFilter).select("_id name code department branch company").lean();
  const empIds = employees.map(e => e._id);
  const empMap = {};
  employees.forEach(e => { empMap[e._id.toString()] = e; });

  const records = await Attendance.find({
    employee: { $in: empIds },
    date: { $gte: start, $lte: end }
  }).lean();

  // Group by employee
  const grouped = {};
  records.forEach(r => {
    const id = r.employee.toString();
    if (!grouped[id]) {
      grouped[id] = { present: 0, absent: 0, late: 0, onLeave: 0, totalDays: 0 };
    }
    grouped[id].totalDays++;
    if (r.status === "Present") grouped[id].present++;
    else if (r.status === "Absent") grouped[id].absent++;
    else if (r.status === "Late") grouped[id].late++;
    else if (r.status === "On Leave") grouped[id].onLeave++;
  });

  return employees.map(emp => {
    const stats = grouped[emp._id.toString()] || { present: 0, absent: 0, late: 0, onLeave: 0, totalDays: 0 };
    return {
      employeeId: emp.code,
      employeeName: emp.name,
      department: emp.department || "N/A",
      branch: emp.branch || "N/A",
      company: emp.company || "N/A",
      present: stats.present,
      absent: stats.absent,
      late: stats.late,
      onLeave: stats.onLeave,
      totalRecorded: stats.totalDays,
      month: `${String(month).padStart(2, "0")}/${year}`
    };
  });
};

// ─── 2. SALARY PAID REPORT (per-employee) ────────────────────────────────────
export const getSalaryPaidReport = async ({ month, year, branch, department, company, employeeId } = {}) => {
  const empFilter = {};
  if (branch && branch !== "All Branches") empFilter.branch = branch;
  if (department && department !== "All Departments") empFilter.department = department;
  if (company && company !== "All Companies") empFilter.company = company;

  const employees = await Employee.find(empFilter).select("_id name code department branch company").lean();
  const empIds = employees.map(e => e._id);
  const empMap = {};
  employees.forEach(e => { empMap[e._id.toString()] = e; });

  const payrollFilter = {
    month: parseInt(month),
    year: parseInt(year),
    employee: { $in: empIds }
  };
  if (employeeId) payrollFilter.employee = employeeId;

  const payrolls = await Payroll.find(payrollFilter).lean();

  return payrolls.map(p => {
    const emp = empMap[p.employee.toString()] || {};
    const allowanceBreakdown = (p.allowances || []).map(a => `${a.name}: ${a.amount}`).join(" | ");
    const deductionBreakdown = (p.deductions || []).map(d => `${d.name}: ${d.amount}`).join(" | ");

    return {
      employeeId: emp.code || "N/A",
      employeeName: emp.name || "N/A",
      department: emp.department || "N/A",
      branch: emp.branch || "N/A",
      company: emp.company || "N/A",
      basicSalary: p.basicSalary || 0,
      totalAllowances: p.totalAllowances || 0,
      totalDeductions: p.totalDeductions || 0,
      netSalary: p.netSalary || 0,
      status: p.status,
      allowanceBreakdown,
      deductionBreakdown,
      month: `${String(month).padStart(2, "0")}/${year}`
    };
  });
};

// ─── 3. SALARY REVISION HISTORY ──────────────────────────────────────────────
export const getSalaryRevisionReport = async ({ branch, department, company, employeeId, fromDate, toDate } = {}) => {
  const empFilter = {};
  if (branch && branch !== "All Branches") empFilter.branch = branch;
  if (department && department !== "All Departments") empFilter.department = department;
  if (company && company !== "All Companies") empFilter.company = company;
  if (employeeId) empFilter._id = employeeId;

  const employees = await Employee.find(empFilter)
    .select("_id name code department branch company salaryHistory")
    .lean();

  const rows = [];
  employees.forEach(emp => {
    (emp.salaryHistory || []).forEach(h => {
      const effectiveDate = new Date(h.effectiveDate);
      if (fromDate && effectiveDate < new Date(fromDate)) return;
      if (toDate && effectiveDate > new Date(toDate)) return;

      rows.push({
        employeeId: emp.code,
        employeeName: emp.name,
        department: emp.department || "N/A",
        branch: emp.branch || "N/A",
        company: emp.company || "N/A",
        revisionType: h.salaryType || "N/A",
        previousSalary: (h.basicSalary || 0) - (h.incrementAmount || 0),
        incrementAmount: h.incrementAmount || 0,
        newSalary: h.basicSalary || 0,
        effectiveDate: effectiveDate.toLocaleDateString(),
        notes: h.notes || ""
      });
    });
  });

  return rows.sort((a, b) => new Date(b.effectiveDate) - new Date(a.effectiveDate));
};

// ─── 4. LEAVE BALANCE & SUMMARY REPORT ───────────────────────────────────────
export const getLeaveBalanceReport = async ({ branch, department, company, year } = {}) => {
  const empFilter = {};
  if (branch && branch !== "All Branches") empFilter.branch = branch;
  if (department && department !== "All Departments") empFilter.department = department;
  if (company && company !== "All Companies") empFilter.company = company;

  const employees = await Employee.find(empFilter).select("_id name code department branch company").lean();
  const empIds = employees.map(e => e._id);
  const empMap = {};
  employees.forEach(e => { empMap[e._id.toString()] = e; });

  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const leaveRecords = await Attendance.find({
    employee: { $in: empIds },
    status: "On Leave",
    date: { $gte: yearStart, $lte: yearEnd }
  }).lean();

  // Group by employee and leave type
  const grouped = {};
  leaveRecords.forEach(r => {
    const id = r.employee.toString();
    if (!grouped[id]) grouped[id] = { sick: 0, annual: 0, casual: 0, unpaid: 0, maternity: 0, other: 0 };
    const lt = (r.leaveType || "").toLowerCase();
    if (lt.includes("sick")) grouped[id].sick += r.leaveDuration || 1;
    else if (lt.includes("annual")) grouped[id].annual += r.leaveDuration || 1;
    else if (lt.includes("casual")) grouped[id].casual += r.leaveDuration || 1;
    else if (lt.includes("unpaid")) grouped[id].unpaid += r.leaveDuration || 1;
    else if (lt.includes("maternity")) grouped[id].maternity += r.leaveDuration || 1;
    else grouped[id].other += r.leaveDuration || 1;
  });

  return employees.map(emp => {
    const stats = grouped[emp._id.toString()] || { sick: 0, annual: 0, casual: 0, unpaid: 0, maternity: 0, other: 0 };
    const totalTaken = Object.values(stats).reduce((a, b) => a + b, 0);
    return {
      employeeId: emp.code,
      employeeName: emp.name,
      department: emp.department || "N/A",
      branch: emp.branch || "N/A",
      company: emp.company || "N/A",
      sickLeave: stats.sick,
      annualLeave: stats.annual,
      casualLeave: stats.casual,
      unpaidLeave: stats.unpaid,
      maternityLeave: stats.maternity,
      otherLeave: stats.other,
      totalLeaveTaken: totalTaken,
      year
    };
  });
};

// ─── 5. HEADCOUNT REPORT ─────────────────────────────────────────────────────
export const getHeadcountReport = async ({ branch, department, company } = {}) => {
  const matchFilter = {};
  if (branch && branch !== "All Branches") matchFilter.branch = branch;
  if (department && department !== "All Departments") matchFilter.department = department;
  if (company && company !== "All Companies") matchFilter.company = company;

  const data = await Employee.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: { branch: "$branch", department: "$department", company: "$company" },
        total: { $sum: 1 },
        active: { $sum: { $cond: [{ $eq: ["$status", "Active"] }, 1, 0] } },
        inactive: { $sum: { $cond: [{ $eq: ["$status", "Inactive"] }, 1, 0] } },
        onLeave: { $sum: { $cond: [{ $eq: ["$status", "On Leave"] }, 1, 0] } },
        onboarding: { $sum: { $cond: [{ $eq: ["$status", "Onboarding"] }, 1, 0] } }
      }
    },
    {
      $project: {
        _id: 0,
        branch: "$_id.branch",
        department: "$_id.department",
        company: "$_id.company",
        total: 1,
        active: 1,
        inactive: 1,
        onLeave: 1,
        onboarding: 1
      }
    },
    { $sort: { company: 1, branch: 1, department: 1 } }
  ]);

  return data;
};

// ─── 6. ASSET REPORT (per employee) ──────────────────────────────────────────
export const getAssetAssignmentReport = async ({ branch, department, company, employeeId } = {}) => {
  const empFilter = {};
  if (branch && branch !== "All Branches") empFilter.branch = branch;
  if (department && department !== "All Departments") empFilter.department = department;
  if (company && company !== "All Companies") empFilter.company = company;
  if (employeeId) empFilter._id = employeeId;

  const employees = await Employee.find(empFilter).select("_id name code department branch company").lean();
  const empIds = employees.map(e => e._id);
  const empMap = {};
  employees.forEach(e => { empMap[e._id.toString()] = e; });

  const assets = await Asset.find({
    isDeleted: false,
    "currentLocation.employee": { $in: empIds }
  }).lean();

  return assets.map(a => {
    const empId = a.currentLocation?.employee?.toString();
    const emp = empMap[empId] || {};
    return {
      assetCode: a.assetCode,
      assetName: a.name,
      assetType: a.type || "N/A",
      category: a.category || "N/A",
      serialNumber: a.serialNumber || "N/A",
      employeeId: emp.code || "N/A",
      employeeName: emp.name || "N/A",
      department: emp.department || "N/A",
      branch: emp.branch || a.branch || "N/A",
      company: emp.company || a.company || "N/A",
      status: a.status,
      purchaseCost: a.purchaseCost || 0,
      purchaseDate: a.purchaseDate ? new Date(a.purchaseDate).toLocaleDateString() : "N/A",
      assignedSince: a.updatedAt ? new Date(a.updatedAt).toLocaleDateString() : "N/A"
    };
  });
};

// ─── 7. OVERTIME & ALLOWANCE REPORT ──────────────────────────────────────────
export const getOvertimeAllowanceReport = async ({ month, year, branch, department, company, employeeId } = {}) => {
  const empFilter = {};
  if (branch && branch !== "All Branches") empFilter.branch = branch;
  if (department && department !== "All Departments") empFilter.department = department;
  if (company && company !== "All Companies") empFilter.company = company;

  const employees = await Employee.find(empFilter).select("_id name code department branch company").lean();
  const empIds = employees.map(e => e._id);
  const empMap = {};
  employees.forEach(e => { empMap[e._id.toString()] = e; });

  const payrollFilter = {
    month: parseInt(month),
    year: parseInt(year),
    employee: { $in: empIds }
  };
  if (employeeId) payrollFilter.employee = employeeId;

  const payrolls = await Payroll.find(payrollFilter).lean();

  return payrolls.map(p => {
    const emp = empMap[p.employee.toString()] || {};

    // Extract overtime pay from allowances
    const overtimeAllowance = (p.allowances || []).find(a =>
      /overtime|OT/i.test(a.name || "")
    );
    const overtimePay = overtimeAllowance?.amount || 0;
    const overtimeHours = p.attendanceSummary?.overtimeHours || 0;

    // Extract named allowances
    const accommodationAllowance = (p.allowances || []).find(a => /accommodation/i.test(a.name || ""))?.amount || 0;
    const vehicleAllowance = (p.allowances || []).find(a => /vehicle/i.test(a.name || ""))?.amount || 0;
    const housingAllowance = (p.allowances || []).find(a => /housing|hra/i.test(a.name || ""))?.amount || 0;

    // All other allowances
    const otherAllowances = (p.allowances || [])
      .filter(a => !/overtime|OT|accommodation|vehicle|housing|hra/i.test(a.name || ""))
      .map(a => `${a.name}: ${a.amount} AED`)
      .join(" | ");

    return {
      employeeId: emp.code || "N/A",
      employeeName: emp.name || "N/A",
      department: emp.department || "N/A",
      branch: emp.branch || "N/A",
      company: emp.company || "N/A",
      month: `${String(month).padStart(2, "0")}/${year}`,
      basicSalary: p.basicSalary || 0,
      overtimeHours,
      overtimePay,
      accommodationAllowance,
      vehicleAllowance,
      housingAllowance,
      otherAllowances,
      totalAllowances: p.totalAllowances || 0,
      totalDeductions: p.totalDeductions || 0,
      netSalary: p.netSalary || 0,
      payrollStatus: p.status || "N/A"
    };
  });
};
