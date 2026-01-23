


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
    console.error("Dashboard metrics error:", error);
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
    const employees = await Employee.find({ visaExpiry: { $ne: null } })
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
    const pending = await Request.find({ status: "PENDING" })
      .populate("userId", "name")
      .sort({ submittedAt: 1 })
      .limit(5);
    res.json(pending);
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
    const stats = await Attendance.aggregate([
      { $match: { date: today } },
      {
        $lookup: {
          from: "employees",
          localField: "employee",
          foreignField: "_id",
          as: "empInfo"
        }
      },
      { $unwind: "$empInfo" },
      {
        $group: {
          _id: "$empInfo.department",
          present: { $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] } },
          leave: { $sum: { $cond: [{ $eq: ["$status", "On Leave"] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ["$status", "Absent"] }, 1, 0] } },
          total: { $sum: 1 }
        }
      },
      {
        $project: {
          department: "$_id",
          present: 1,
          leave: 1,
          absent: 1,
          total: 1,
          _id: 0
        }
      }
    ]);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

