// src/pages/myRequests/MyRequestsViewModel.js
// ViewModel supplying mock data; replace with API calls when ready.
export const myRequests = [
  {
    id: 1,
    name: "John Smith",
    empId: "EMP010",
    type: "Annual Leave",
    dateRange: "2025-12-05 to 2025-12-09",
    days: 5,
    reason: "Personal travel",
    status: "Pending",
  },
  {
    id: 2,
    name: "Emma Wilson",
    empId: "EMP015",
    type: "Salary Advance",
    dateRange: "Amount: AED 3,000",
    days: null,
    reason: "Emergency expenses",
    status: "Pending",
  },
  {
    id: 3,
    name: "Liam Patel",
    empId: "EMP024",
    type: "Remote Work",
    dateRange: "2025-12-12 to 2025-12-14",
    days: 3,
    reason: "Family support",
    status: "Pending",
  },
];

