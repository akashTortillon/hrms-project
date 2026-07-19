import ActivityLog from "../models/activityLogModel.js";

/**
 * Log an activity. Call this from any controller.
 * @param {Object} params
 * @param {Object} params.req - Express request object (for user + IP info)
 * @param {string} params.action - Action type (LOGIN, CREATE, UPDATE, etc.)
 * @param {string} params.module - Module name (EMPLOYEE, PAYROLL, etc.)
 * @param {string} params.description - Human-readable description
 * @param {string} [params.targetId] - ID of the affected record
 * @param {string} [params.targetName] - Name of the affected record
 * @param {string} [params.status] - SUCCESS or FAILED
 * @param {Object} [params.metadata] - Any extra data
 */
export const logActivity = async ({
  req,
  action,
  module = "OTHER",
  description = "",
  targetId = "",
  targetName = "",
  status = "SUCCESS",
  metadata = {}
}) => {
  try {
    const user = req?.user;
    const ip = req?.headers?.["x-forwarded-for"]?.split(",")[0]?.trim()
      || req?.socket?.remoteAddress
      || "";
    const userAgent = req?.headers?.["user-agent"] || "";

    await ActivityLog.create({
      user: user?._id || user?.id || null,
      userName: user?.name || "System",
      userRole: user?.role || "",
      userEmail: user?.email || "",
      action,
      module,
      description,
      targetId: String(targetId),
      targetName: String(targetName),
      ipAddress: ip,
      userAgent,
      status,
      metadata
    });
  } catch (err) {
    // Never let logging crash the main request
    console.error("Activity log error:", err.message);
  }
};
