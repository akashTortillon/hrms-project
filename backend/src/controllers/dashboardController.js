


import Employee from "../models/employeeModel.js";
import Request from "../models/requestModel.js";
import Asset from "../models/assetModel.js";
import CompanyDocument from "../models/companyDocModel.js";
import Attendance from "../models/attendanceModel.js";

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

    const totalPending = await Request.countDocuments({ status: "PENDING" });
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const urgentApprovals = await Request.countDocuments({
      status: "PENDING",
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
 * EMPLOYEE VISA EXPIRIES
 */
export const getEmployeeVisaExpiries = async (req, res) => {
  try {
    let query = { visaExpiry: { $ne: null } };

    // If user DOES NOT have VIEW_ALL_EMPLOYEES permission, only show their own expiry
    if (!req.user.permissions.includes("VIEW_ALL_EMPLOYEES") && req.user.role !== "Admin") {
      query._id = req.user.employeeId;
    }

    const employees = await Employee.find(query)
      .sort({ visaExpiry: 1 })
      .limit(5);
    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * PENDING APPROVALS
 */
export const getPendingApprovals = async (req, res) => {
  try {
    const totalPending = await Request.countDocuments({ status: "PENDING" });
    const pending = await Request.find({ status: "PENDING" })
      .populate("userId", "name")
      .sort({ submittedAt: 1 })
      .limit(5);
    res.json({
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

