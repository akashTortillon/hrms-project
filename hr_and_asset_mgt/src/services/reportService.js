// backend/services/reportService.js
import Attendance from "../models/Attendance.js";
import Employee from "../models/Employee.js";

export const getDepartmentAttendance = async (month, year) => {
  // Convert month/year to date range
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);

  // Aggregate attendance by department
  const data = await Attendance.aggregate([
    {
      $match: {
        date: { $gte: start.toISOString().split("T")[0], $lte: end.toISOString().split("T")[0] },
      },
    },
    {
      $lookup: {
        from: "employees", // collection name in MongoDB
        localField: "employee",
        foreignField: "_id",
        as: "employee",
      },
    },
    { $unwind: "$employee" },
    {
      $group: {
        _id: "$employee.department",
        totalEmployees: { $addToSet: "$employee._id" }, // unique employees
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
