import ActivityLog from "../models/activityLogModel.js";
import * as XLSX from "xlsx";

const isAdmin = (user = {}) =>
  user.role === "Admin" ||
  /^HR/i.test(user.role || "") ||
  user.permissions?.includes("ALL");

export const getActivityLogs = async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const {
      userId, action, module, status,
      startDate, endDate, search,
      page = 1, limit = 50,
      export: isExport
    } = req.query;

    const filter = {};
    if (userId) filter.user = userId;
    if (action) filter.action = action;
    if (module) filter.module = module;
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }
    if (search) {
      filter.$or = [
        { userName: { $regex: search, $options: "i" } },
        { userEmail: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { targetName: { $regex: search, $options: "i" } }
      ];
    }

    if (isExport === "true") {
      const logs = await ActivityLog.find(filter)
        .sort({ createdAt: -1 })
        .limit(5000)
        .lean();

      const exportData = logs.map(l => ({
        "Date & Time": new Date(l.createdAt).toLocaleString(),
        "User": l.userName,
        "Email": l.userEmail,
        "Role": l.userRole,
        "Action": l.action,
        "Module": l.module,
        "Description": l.description,
        "Record": l.targetName,
        "Status": l.status,
        "IP Address": l.ipAddress
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Activity Log");
      const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

      res.setHeader("Content-Disposition", `attachment; filename="Activity_Log_${new Date().toISOString().split("T")[0]}.xlsx"`);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      return res.send(buffer);
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(200, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [total, logs] = await Promise.all([
      ActivityLog.countDocuments(filter),
      ActivityLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("user", "name email role")
        .lean()
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const getActivityStats = async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const [totalLogs, recentLogs, byModule, byAction, topUsers] = await Promise.all([
      ActivityLog.countDocuments({}),
      ActivityLog.countDocuments({ createdAt: { $gte: last30Days } }),
      ActivityLog.aggregate([
        { $group: { _id: "$module", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      ActivityLog.aggregate([
        { $group: { _id: "$action", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      ActivityLog.aggregate([
        { $match: { createdAt: { $gte: last30Days } } },
        { $group: { _id: "$userName", email: { $first: "$userEmail" }, role: { $first: "$userRole" }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);

    res.json({
      success: true,
      data: { totalLogs, recentLogs, byModule, byAction, topUsers }
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const clearOldLogs = async (req, res) => {
  try {
    if (req.user?.role !== "Admin") {
      return res.status(403).json({ message: "Only Admin can clear logs" });
    }
    const { olderThanDays = 90 } = req.body;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(olderThanDays));
    const result = await ActivityLog.deleteMany({ createdAt: { $lt: cutoff } });
    res.json({ success: true, message: `Deleted ${result.deletedCount} log entries older than ${olderThanDays} days` });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
