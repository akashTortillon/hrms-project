


import Employee from "../models/employeeModel.js";
import Request from "../models/requestModel.js";
import Asset from "../models/assetModel.js";

/**
 * DASHBOARD SUMMARY (STEP 1 – Total Employees only)
 */
export const getDashboardSummary = async (req, res) => {


  try {
    /** ---------------------------
     * TOTAL ACTIVE EMPLOYEES
     * --------------------------*/
    const totalEmployees = await Employee.countDocuments({
      status: "Active",
    });

    /** ---------------------------
     * JOINED THIS MONTH
     * --------------------------*/
    const now = new Date();
    const startOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
      0,
      0,
      0
    );

    const joinedThisMonth = await Employee.countDocuments({
      status: "Active",
      joinDate: { $gte: startOfMonth },
    });

    /** ---------------------------
     * PENDING APPROVALS & URGENT
     * --------------------------*/
    const totalPending = await Request.countDocuments({ status: "PENDING" });
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const urgentApprovals = await Request.countDocuments({
      status: "PENDING",
      submittedAt: { $lte: threeDaysAgo }
    });

    /** ---------------------------
     * ASSETS IN SERVICE & DUE
     * --------------------------*/
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
    // console.error("Dashboard metrics error:", error);
    res.status(500).json({ message: "Dashboard metrics failed" });
  }
};

/* --------------------------------------------------
   KEEP THESE DUMMY ENDPOINTS FOR NOW (NO CHANGE)
--------------------------------------------------- */

export const getCompanyDocumentExpiries = (req, res) => {
  res.json([
    {
      id: 1,
      primaryText: "Trade License",
      secondaryText: "Main Office",
      badge: { text: "16 days", variant: "warning" },
      dateText: "2025-12-15",
    },
  ]);
};

export const getEmployeeVisaExpiries = (req, res) => {
  res.json([
    {
      id: 1,
      primaryText: "Ahmed Ali",
      secondaryText: "Employment Visa",
      badge: { text: "6 days", variant: "danger" },
      dateText: "2025-12-05",
    },
  ]);
};

export const getPendingApprovals = (req, res) => {
  res.json([
    {
      id: 1,
      primaryText: "John Smith",
      secondaryText: "Annual Leave",
    },
  ]);
};

export const getTodaysAttendance = (req, res) => {
  res.json([
    {
      id: 1,
      primaryText: "Sales",
      progress: { present: 42, leave: 3, absent: 2, total: 47 },
    },
  ]);
};

