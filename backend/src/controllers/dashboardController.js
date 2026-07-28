


import Employee from "../models/employeeModel.js";
import Request from "../models/requestModel.js";
import Asset from "../models/assetModel.js";
import CompanyDocument from "../models/companyDocModel.js";
import Attendance from "../models/attendanceModel.js";
import EmployeeDocument from "../models/employeeDocumentModel.js";
import { computeExpiryStatus } from "../utils/expiryStatus.js";
import { getApprovalStageFilter } from "../utils/approvalStageFilter.js";

/**
 * DASHBOARD SUMMARY (TOP CARDS)
 */
export const getDashboardSummary = async (req, res) => {
  try {
    const totalEmployees = await Employee.countDocuments({ status: "Active" });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const joinedThisMonth = await Employee.countDocuments({
      status: "Active",
      joinDate: { $gte: startOfMonth },
    });

    // Only count requests actually at this viewer's approval stage - a request's
    // overall status stays "PENDING" through its whole Manager -> Finance -> HR
    // lifecycle, so a naive status-only count inflates this above what's actually
    // actionable (see getApprovalStageFilter for why).
    const stageFilters = getApprovalStageFilter(req.user);
    const pendingQuery = stageFilters.length ? { status: "PENDING", $or: stageFilters } : { _id: null };

    const totalPending = await Request.countDocuments(pendingQuery);
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const urgentApprovals = await Request.countDocuments({
      ...pendingQuery,
      submittedAt: { $lte: threeDaysAgo }
    });

    const assetsInService = await Asset.countDocuments({ status: "In Use" });
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const assetsDue = await Asset.countDocuments({
      serviceDueDate: { $gte: now, $lte: thirtyDaysFromNow }
    });

    res.json({
      totalEmployees,
      employeesAddedThisMonth: joinedThisMonth,
      pendingApprovals: totalPending,
      urgentApprovals,
      assetsInService,
      assetsDueService: assetsDue
    });
  } catch (error) {
    res.status(500).json({ message: "Dashboard metrics failed" });
  }
};

/**
 * COMPANY DOCUMENT EXPIRIES
 */
export const getCompanyDocumentExpiries = async (req, res) => {
  try {
    const documents = await CompanyDocument.find({ expiryDate: { $ne: null } })
      .sort({ expiryDate: 1 })
      .limit(5);
    res.json(documents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * EMPLOYEE VISA / ID EXPIRIES
 * Was visaExpiry-only, which almost never had data (passport/EID expiry is what's actually
 * used) — broadened to cover all three plain Employee fields, AND uploaded EmployeeDocument
 * records (passport/visa/Emirates ID/labour card scans etc). An expired uploaded document
 * was invisible here before, since only the three bare fields on Employee were checked.
 * Flattens to one row per expiring document so the dashboard/modal can show "Passport
 * expiring" and "Emirates ID expiring" as distinct entries even for the same employee.
 * Excludes documents that are still comfortably "Valid" (not due for 30+ days) since this is
 * a reminder list, not a full directory.
 * Pass ?all=true for the full list (View All modal); default is top 5 soonest.
 */
export const getEmployeeVisaExpiries = async (req, res) => {
  try {
    const restrictToSelf = !req.user.permissions.includes("VIEW_ALL_EMPLOYEES") && req.user.role !== "Admin";

    let employeeQuery = {
      $or: [
        { visaExpiry: { $ne: null } },
        { passportExpiry: { $ne: null } },
        { emiratesIdExpiry: { $ne: null } }
      ]
    };
    if (restrictToSelf) employeeQuery._id = req.user.employeeId;

    const employees = await Employee.find(employeeQuery)
      .select("name designation code visaExpiry passportExpiry emiratesIdExpiry");

    const rows = [];
    employees.forEach((emp) => {
      [
        { documentType: "Visa", expiryDate: emp.visaExpiry },
        { documentType: "Passport", expiryDate: emp.passportExpiry },
        { documentType: "Emirates ID", expiryDate: emp.emiratesIdExpiry }
      ].forEach(({ documentType, expiryDate }) => {
        if (!expiryDate) return;
        const status = computeExpiryStatus(expiryDate);
        if (status === "Valid") return;
        rows.push({
          _id: emp._id,
          name: emp.name,
          designation: emp.designation,
          code: emp.code,
          documentType,
          expiryDate,
          status
        });
      });
    });

    const docQuery = { expiryDate: { $ne: null } };
    if (restrictToSelf) docQuery.employeeId = req.user.employeeId;

    const uploadedDocs = await EmployeeDocument.find(docQuery)
      .populate("employeeId", "name designation code");

    uploadedDocs.forEach((doc) => {
      if (!doc.employeeId) return; // employee since deleted
      const status = computeExpiryStatus(doc.expiryDate);
      if (status === "Valid") return;
      rows.push({
        _id: doc.employeeId._id,
        name: doc.employeeId.name,
        designation: doc.employeeId.designation,
        code: doc.employeeId.code,
        documentType: doc.documentType,
        expiryDate: doc.expiryDate,
        status
      });
    });

    rows.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

    const isAll = req.query.all === "true";
    res.json(isAll ? rows : rows.slice(0, 5));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * PENDING APPROVALS
 */
export const getPendingApprovals = async (req, res) => {
  try {
    const { type } = req.query;
    const stageFilters = getApprovalStageFilter(req.user);
    let query = stageFilters.length
      ? { status: "PENDING", $or: stageFilters }
      : { _id: null };

    if (type) {
      // Allow flexible type matching (case-insensitive for convenience)
      query.requestType = type.toUpperCase();
    }

    const totalPending = await Request.countDocuments(query);
    const pending = await Request.find(query)
      .populate("userId", "name avatar role") // Added avatar/role for better UI
      .sort({ submittedAt: -1 }) // Show NEWEST first (usually better for "Pending")
      .limit(3);

    res.status(200).json({
      count: totalPending,
      data: pending
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * TODAY'S ATTENDANCE
 */
export const getTodaysAttendance = async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    /**
     * ✅ COMPLEX AGGREGATION:
     * 1. Start from Active Employees
     * 2. Join with Attendance for TODAY
     * 3. Group by Department
     * 4. Count Present (incl. Late), Leave (On Leave), and Absent (Absent OR No Record)
     */
    const stats = await Employee.aggregate([
      // Only active employees
      { $match: { status: "Active" } },

      // Left-join with Attendance for the specific date
      {
        $lookup: {
          from: "attendances",
          let: { empId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$employee", "$$empId"] },
                    { $eq: ["$date", today] }
                  ]
                }
              }
            }
          ],
          as: "todayAttendance"
        }
      },

      // Extract the first attendance record (if any)
      {
        $addFields: {
          attendanceRecord: { $arrayElemAt: ["$todayAttendance", 0] }
        }
      },

      // Determine Status for counting
      {
        $addFields: {
          actualStatus: {
            $cond: [
              { $not: ["$attendanceRecord"] },
              "Absent", // No record = Absent
              {
                $switch: {
                  branches: [
                    {
                      case: { $in: ["$attendanceRecord.status", ["Present", "Late"]] },
                      then: "Present"
                    },
                    {
                      case: { $eq: ["$attendanceRecord.status", "On Leave"] },
                      then: "Leave"
                    }
                  ],
                  default: "Absent"
                }
              }
            ]
          }
        }
      },

      // Group by Department
      {
        $group: {
          _id: "$department",
          present: { $sum: { $cond: [{ $eq: ["$actualStatus", "Present"] }, 1, 0] } },
          leave: { $sum: { $cond: [{ $eq: ["$actualStatus", "Leave"] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ["$actualStatus", "Absent"] }, 1, 0] } },
          total: { $sum: 1 }
        }
      },

      // Final Projection
      {
        $project: {
          department: "$_id",
          present: 1,
          leave: 1,
          absent: 1,
          total: 1,
          _id: 0
        }
      },

      // Sort alphabetically
      { $sort: { department: 1 } }
    ]);

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


/**
 * MOBILE DASHBOARD STATS
 * Returns counts for Present, Absent, Late, and Pending Requests
 */
export const getMobileDashboardStats = async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    // 1. Get Attendance Stats
    const attendanceStats = await Employee.aggregate([
      { $match: { status: "Active" } },
      {
        $lookup: {
          from: "attendances",
          let: { empId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$employee", "$$empId"] },
                    { $eq: ["$date", today] }
                  ]
                }
              }
            }
          ],
          as: "todayAttendance"
        }
      },
      {
        $addFields: {
          attendanceRecord: { $arrayElemAt: ["$todayAttendance", 0] }
        }
      },
      {
        $addFields: {
          actualStatus: {
            $cond: [
              { $not: ["$attendanceRecord"] },
              "Absent",
              {
                $switch: {
                  branches: [
                    {
                      case: { $in: ["$attendanceRecord.status", ["Present", "Late"]] },
                      then: "$attendanceRecord.status" // Keep "Present" or "Late"
                    },
                    {
                      case: { $eq: ["$attendanceRecord.status", "On Leave"] },
                      then: "Leave"
                    }
                  ],
                  default: "Absent"
                }
              }
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          present: { $sum: { $cond: [{ $eq: ["$actualStatus", "Present"] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ["$actualStatus", "Late"] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ["$actualStatus", "Absent"] }, 1, 0] } },
          total: { $sum: 1 }
        }
      }
    ]);

    const stats = attendanceStats[0] || { present: 0, late: 0, absent: 0, total: 0 };

    // 2. Get Pending Requests Count (scoped to this viewer's actual approval stage)
    const requestStageFilters = getApprovalStageFilter(req.user);
    const pendingRequests = requestStageFilters.length
      ? await Request.countDocuments({ status: "PENDING", $or: requestStageFilters })
      : 0;

    res.status(200).json({
      present: stats.present,
      late: stats.late,
      absent: stats.absent,
      totalEmployees: stats.total,
      pendingRequests
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
