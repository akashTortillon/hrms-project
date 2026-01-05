export const getDashboardMetrics = (req, res) => {
  res.json([
    {
      title: "Total Employees",
      value: "247",
      subtext: "+12",
      iconName: "users",
      iconBgClass: "dashboard-icon-bg-blue",
    },
    {
      title: "Documents Expiring",
      value: "18",
      subtext: "This Month",
      iconName: "exclamation",
      iconBgClass: "dashboard-icon-bg-yellow",
    },
    {
      title: "Pending Approvals",
      value: "7",
      subtext: "3 Urgent",
      iconName: "clock (1)",
      iconBgClass: "dashboard-icon-bg-orange",
    },
    {
      title: "Assets In Service",
      value: "432",
      subtext: "12 Due",
      iconName: "cube",
      iconBgClass: "dashboard-icon-bg-green",
    },
  ]);
};

export const getCompanyDocumentExpiries = (req, res) => {
  res.json([
    {
      id: 1,
      primaryText: "Trade License",
      secondaryText: "Main Office",
      badge: { text: "16 days", variant: "warning" },
      dateText: "2025-12-15",
    },
    {
      id: 2,
      primaryText: "Insurance Policy",
      secondaryText: "Branch RAK",
      badge: { text: "9 days", variant: "danger" },
      dateText: "2025-12-08",
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
