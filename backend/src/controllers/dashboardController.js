


import Employee from "../models/employeeModel.js";

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

    res.json({
      totalEmployees,
      employeesAddedThisMonth: joinedThisMonth,
    });
  } catch (error) {
    console.error("Dashboard metrics error:", error);
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

