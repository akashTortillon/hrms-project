// import Request from "../models/requestModel.js";
// import Employee from "../models/employeeModel.js";
// import Attendance from "../models/attendanceModel.js";
// import User from "../models/userModel.js";
// import { sendEmail } from "../utils/sendEmail.js";
// import upload from "../config/multer.js";
// import path from "path";

// const markLeaveAttendance = async (userId, fromDate, toDate) => {
//   const user = await User.findById(userId);
//   if (!user) throw new Error("User not found");

//   const employee = await Employee.findOne({ email: user.email });
//   if (!employee) {
//     throw new Error("Employee not found for leave request");
//   }

//   const start = new Date(fromDate);
//   const end = new Date(toDate);

//   for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
//     const dateStr = d.toISOString().split("T")[0];

//     await Attendance.findOneAndUpdate(
//       { employee: employee._id, date: dateStr },
//       {
//         employee: employee._id,
//         date: dateStr,
//         status: "On Leave",
//         checkIn: null,
//         checkOut: null,
//         workHours: null,
//         shift: "Day Shift"
//       },
//       { upsert: true, new: true }
//     );
//   }
// };

// // Generate next request ID (REQ001, REQ002, etc.)
// const generateRequestId = async () => {
//   const lastRequest = await Request.findOne().sort({ requestId: -1 });

//   if (!lastRequest || !lastRequest.requestId) {
//     return "REQ001";
//   }

//   const lastNumber = parseInt(lastRequest.requestId.replace("REQ", ""));
//   const nextNumber = lastNumber + 1;
//   return `REQ${nextNumber.toString().padStart(3, "0")}`;
// };

// // ✅ UPDATED: Get request type label for emails
// const getRequestTypeLabel = (request) => {
//   if (request.requestType === "SALARY") {
//     return request.subType === "loan" ? "Loan Application" : "Salary Advance";
//   }
//   return request.requestType;
// };

// // ✅ UPDATED: Email helper functions with dynamic subject lines
// const sendSalaryAdvanceSubmissionEmail = async (request, employeeUser) => {
//   try {
//     if (!process.env.SMTP_EMAIL || !process.env.SMTP_APP_PASSWORD) {
//       console.error("❌ Email configuration missing");
//       return;
//     }

//     const hrAdmins = await User.find({ role: { $in: ["HR Admin", "Admin"] } });
//     const financeTeam = await User.find({ role: "Finance" });

//     const toEmails = [
//       ...hrAdmins.map(admin => admin.email),
//       ...financeTeam.map(finance => finance.email)
//     ].filter(email => email);

//     if (toEmails.length === 0) {
//       console.warn("⚠️ No HR/Finance users found, using SMTP email as fallback");
//       toEmails.push(process.env.SMTP_EMAIL);
//     }

//     let ccEmails = [];
//     if (employeeUser.employeeId) {
//       const employee = await Employee.findById(employeeUser.employeeId);
//       if (employee?.reportingManager) {
//         const manager = await User.findById(employee.reportingManager);
//         if (manager?.email) ccEmails.push(manager.email);
//       }
//     }

//     // ✅ Dynamic subject based on subType
//     const requestLabel = request.subType === "loan" ? "Loan Request" : "Salary Advance Request";
//     const subject = `${requestLabel} Submitted – ${employeeUser.name}`;

//     const html = `
//       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
//         <h2 style="color: #333;">${requestLabel} Submitted</h2>
//         <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
//           <p><strong>Employee Name:</strong> ${employeeUser.name}</p>
//           <p><strong>Request ID:</strong> ${request.requestId}</p>
//           <p><strong>Request Type:</strong> ${requestLabel}</p>
//           <p><strong>Requested Amount:</strong> AED ${request.details.amount || 'N/A'}</p>
//           <p><strong>Repayment Period:</strong> ${request.details.repaymentPeriod || 'N/A'}</p>
//           <p><strong>Reason:</strong> ${request.details.reason || 'N/A'}</p>
//           <p><strong>Submitted Date:</strong> ${new Date(request.submittedAt).toLocaleDateString()}</p>
//         </div>
//         <p style="margin-top: 20px; color: #666;">Please review this request in the HRMS system.</p>
//       </div>
//     `;

//     const emailOptions = { to: toEmails.join(', '), subject, html };
//     if (ccEmails.length > 0) emailOptions.cc = ccEmails.join(', ');

//     await sendEmail(emailOptions);
//     console.log(`✅ ${requestLabel} submission email sent successfully`);
//   } catch (error) {
//     console.error("❌ Failed to send submission email:", error);
//   }
// };

// const sendSalaryAdvanceApprovalEmail = async (request, employeeUser) => {
//   try {
//     if (!employeeUser.email) {
//       console.error("❌ Employee email not found");
//       return;
//     }

//     // ✅ Dynamic subject based on subType
//     const requestLabel = request.subType === "loan" ? "Loan Request" : "Salary Advance Request";
//     const subject = `${requestLabel} Approved`;

//     const html = `
//       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
//         <h2 style="color: #28a745;">${requestLabel} Approved</h2>
//         <div style="background-color: #d4edda; padding: 20px; border-radius: 5px;">
//           <p><strong>Dear ${employeeUser.name},</strong></p>
//           <p>Your ${requestLabel.toLowerCase()} has been approved.</p>
//           <p><strong>Request ID:</strong> ${request.requestId}</p>
//           <p><strong>Approved Amount:</strong> AED ${request.details.amount || 'N/A'}</p>
//           <p><strong>Repayment Period:</strong> ${request.details.repaymentPeriod || 'N/A'}</p>
//           <p><strong>Effective Date:</strong> ${new Date(request.approvedAt).toLocaleDateString()}</p>
//         </div>
//         <p style="margin-top: 20px; color: #666;">The amount will be processed according to the company's payroll schedule.</p>
//       </div>
//     `;

//     await sendEmail({ to: employeeUser.email, subject, html });
//     console.log(`✅ ${requestLabel} approval email sent successfully`);
//   } catch (error) {
//     console.error("❌ Failed to send approval email:", error);
//   }
// };

// const sendSalaryAdvanceRejectionEmail = async (request, employeeUser) => {
//   try {
//     if (!employeeUser.email) {
//       console.error("❌ Employee email not found");
//       return;
//     }

//     // ✅ Dynamic subject based on subType
//     const requestLabel = request.subType === "loan" ? "Loan Request" : "Salary Advance Request";
//     const subject = `${requestLabel} Rejected`;

//     const html = `
//       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
//         <h2 style="color: #dc3545;">${requestLabel} Rejected</h2>
//         <div style="background-color: #f8d7da; padding: 20px; border-radius: 5px;">
//           <p><strong>Dear ${employeeUser.name},</strong></p>
//           <p>Your ${requestLabel.toLowerCase()} has been rejected.</p>
//           <p><strong>Request ID:</strong> ${request.requestId}</p>
//           <p><strong>Rejection Reason:</strong> ${request.rejectionReason || 'No reason provided'}</p>
//         </div>
//         <p style="margin-top: 20px; color: #666;">If you have any questions, please contact HR or Finance department.</p>
//       </div>
//     `;

//     await sendEmail({ to: employeeUser.email, subject, html });
//     console.log(`✅ ${requestLabel} rejection email sent successfully`);
//   } catch (error) {
//     console.error("❌ Failed to send rejection email:", error);
//   }
// };

// // ✅ UPDATED: Create a new request with subType support
// export const createRequest = async (req, res) => {
//   try {
//     const { requestType, subType, details } = req.body;
//     const userId = req.user.id;

//     if (!requestType || !details) {
//       return res.status(400).json({
//         success: false,
//         message: "Request type and details are required"
//       });
//     }

//     if (!["LEAVE", "SALARY", "DOCUMENT"].includes(requestType)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid request type"
//       });
//     }

//     // ✅ Validate subType for SALARY requests
//     if (requestType === "SALARY" && subType && !["salary_advance", "loan"].includes(subType)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid sub type for salary request"
//       });
//     }

//     const requestId = await generateRequestId();

//     const request = await Request.create({
//       userId,
//       requestId,
//       requestType,
//       subType: requestType === "SALARY" ? subType : null, // Only set subType for SALARY requests
//       details,
//       status: "PENDING",
//       submittedAt: new Date()
//     });

//     // Send email notification for Salary Advance/Loan requests
//     if (requestType === "SALARY") {
//       const employeeUser = await User.findById(userId);
//       if (employeeUser) {
//         await sendSalaryAdvanceSubmissionEmail(request, employeeUser);
//       }
//     }

//     return res.status(201).json({
//       success: true,
//       message: "Request submitted successfully",
//       data: request
//     });
//   } catch (error) {
//     console.error("Create request error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to submit request"
//     });
//   }
// };

// // Get all requests for the current user
// export const getMyRequests = async (req, res) => {
//   try {
//     const userId = req.user.id;

//     const requests = await Request.find({ userId })
//       .populate("approvedBy", "name role")
//       .populate("withdrawnBy", "name")
//       .sort({ submittedAt: -1 })
//       .select("-__v");

//     return res.status(200).json({
//       success: true,
//       message: "Requests fetched successfully",
//       data: requests
//     });
//   } catch (error) {
//     console.error("Get my requests error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to fetch requests"
//     });
//   }
// };

// // Withdraw a request (only for PENDING requests)
// export const withdrawRequest = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const userId = req.user.id;

//     const request = await Request.findOne({ _id: id, userId });

//     if (!request) {
//       return res.status(404).json({
//         success: false,
//         message: "Request not found"
//       });
//     }

//     if (request.status !== "PENDING") {
//       return res.status(400).json({
//         success: false,
//         message: "Only pending requests can be withdrawn"
//       });
//     }

//     request.status = "WITHDRAWN";
//     request.withdrawnBy = userId;
//     request.withdrawnAt = new Date();
//     await request.save();

//     const populatedRequest = await Request.findById(request._id)
//       .populate("userId", "name")
//       .populate("withdrawnBy", "name");

//     return res.status(200).json({
//       success: true,
//       message: "Request withdrawn successfully",
//       data: populatedRequest
//     });
//   } catch (error) {
//     console.error("Withdraw request error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to withdraw request"
//     });
//   }
// };

// // Fetch ALL requests for admin
// export const getPendingRequestsForAdmin = async (req, res) => {
//   try {
//     const requests = await Request.find({})
//       .populate("userId", "name")
//       .populate("withdrawnBy", "name")
//       .populate("approvedBy", "name role")
//       .sort({ submittedAt: -1 });

//     res.status(200).json({
//       success: true,
//       data: requests
//     });
//   } catch (error) {
//     console.error("Admin pending requests error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch pending requests"
//     });
//   }
// };

// // Update request status (Approve/Reject)
// export const updateRequestStatus = async (req, res) => {
//   try {
//     const { requestId } = req.params;
//     const { action, rejectionReason } = req.body;

//     const request = await Request.findById(requestId);
//     if (!request) {
//       return res.status(404).json({ success: false, message: "Request not found" });
//     }

//     let newStatus = "REJECTED";

//     if (action === "APPROVE") {
//       if (request.requestType === "DOCUMENT") {
//         newStatus = "COMPLETED";
//       } else {
//         newStatus = "APPROVED";
//       }
//     }

//     request.status = newStatus;
//     request.approvedBy = req.user.id;
//     request.approvedAt = new Date();

//     if (action === "REJECT" && rejectionReason) {
//       request.rejectionReason = rejectionReason;
//     }

//     if (request.requestType === "LEAVE" && action === "APPROVE") {
//       const { fromDate, toDate } = request.details;
//       if (fromDate && toDate) {
//         await markLeaveAttendance(request.userId, fromDate, toDate);
//       }
//     }

//     await request.save();

//     // Send email notifications for Salary Advance/Loan requests
//     if (request.requestType === "SALARY") {
//       const employeeUser = await User.findById(request.userId);
//       if (employeeUser) {
//         if (action === "APPROVE") {
//           await sendSalaryAdvanceApprovalEmail(request, employeeUser);
//         } else if (action === "REJECT") {
//           await sendSalaryAdvanceRejectionEmail(request, employeeUser);
//         }
//       }
//     }

//     const populatedRequest = await Request.findById(request._id)
//       .populate("approvedBy", "name role");

//     res.json({
//       success: true,
//       message: `Request ${newStatus.toLowerCase()} successfully`,
//       data: populatedRequest
//     });
//   } catch (err) {
//     console.error("❌ Update request error:", err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };








import Request from "../models/requestModel.js";
import Employee from "../models/employeeModel.js";
import Attendance from "../models/attendanceModel.js";
import User from "../models/userModel.js";
import Master from "../models/masterModel.js";
import { sendEmail } from "../utils/sendEmail.js";
import { createNotification } from "./notificationController.js";
import path from "path";
import fs from "fs";
import mongoose from "mongoose";
import { deleteStoredFile, getSignedFileUrl, s3ObjectExists, storeUploadedFile } from "../utils/storage.js";
import { logActivity } from "../utils/activityLogger.js";

const safeJsonParse = (value, fallback = {}) => {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const normalizeTypeName = (value = "") => String(value).trim().toLowerCase();

const isSickLeave = (details = {}) => normalizeTypeName(details.leaveType).includes("sick");

const getLeaveDays = (details = {}) => {
  if (details.isHalfDay) return 0.5;
  const fromDate = new Date(details.fromDate);
  const toDate = new Date(details.toDate || details.fromDate);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return 0;
  }
  if (toDate < fromDate) {
    return 0;
  }
  const diffDays = Math.floor((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays);
};

const parsePayrollCycle = (month, year) => {
  const parsedMonth = Number(month);
  const parsedYear = Number(year);

  if (!Number.isInteger(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
    return null;
  }

  if (!Number.isInteger(parsedYear) || parsedYear < 2000 || parsedYear > 9999) {
    return null;
  }

  return { month: parsedMonth, year: parsedYear };
};

const getNextPayrollCycle = (baseDate = new Date()) => {
  const next = new Date(baseDate);
  next.setMonth(next.getMonth() + 1, 1);
  return {
    month: next.getMonth() + 1,
    year: next.getFullYear()
  };
};

const getScheduleOverrides = (details = {}) =>
  Array.isArray(details.repaymentScheduleOverrides) ? details.repaymentScheduleOverrides : [];

const isHrApprover = (user = {}) =>
  user.role === "Admin"
  || /^HR/i.test(user.role || "")
  || user.permissions?.includes("ALL")
  || user.permissions?.includes("APPROVE_REQUESTS");

const isFinanceApprover = (user = {}, request = {}) => {
  const financeManagerId = request.designatedFinanceManager?.toString();
  const isAssignedFinanceManager = financeManagerId && (
    financeManagerId === user._id?.toString()
    || financeManagerId === user.id?.toString()
    || (user.employeeId && financeManagerId === user.employeeId.toString())
  );

  return Boolean(
    isAssignedFinanceManager
    && (
      user.role === "Finance Manager"
      || /^Finance/i.test(user.role || "")
      || user.permissions?.includes("APPROVE_FINANCE_REQUESTS")
      || user.permissions?.includes("ALL")
    )
  );
};

const isManagerApprover = (user = {}, request = {}) => {
  const managerId = request.designatedManager?.toString();
  const isAssignedManager = managerId && (
    managerId === user._id?.toString()
    || managerId === user.id?.toString()
    || (user.employeeId && managerId === user.employeeId.toString())
  );
  return Boolean(
    isAssignedManager
    && (user.role === "Manager" || user.permissions?.includes("APPROVE_MANAGER_REQUESTS"))
  );
};

const formatPayrollCycle = (month, year) => {
  if (!month || !year) return "the configured payroll cycle";
  return `${String(month).padStart(2, "0")}/${year}`;
};

const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const resolveManagerRecipient = async (employee) => {
  if (!employee?.designatedManager) return null;

  const directUser = await User.findById(employee.designatedManager).select("_id name role employeeId");
  if (directUser) {
    return directUser;
  }

  return User.findOne({ employeeId: employee.designatedManager }).select("_id name role employeeId");
};

const resolveFinanceRecipient = async (employee) => {
  if (employee?.designatedFinanceManager) {
    const directUser = await User.findById(employee.designatedFinanceManager).select("_id name role employeeId");
    if (directUser) return directUser;

    const linkedUser = await User.findOne({ employeeId: employee.designatedFinanceManager }).select("_id name role employeeId");
    if (linkedUser) return linkedUser;
  }

  const financeRoles = await Master.find({
    type: "ROLE",
    permissions: { $in: ["APPROVE_FINANCE_REQUESTS", "ALL"] }
  }).select("name");
  const roleNames = financeRoles.map((item) => item.name);
  if (!roleNames.includes("Finance Manager")) {
    roleNames.push("Finance Manager");
  }

  return User.findOne({ role: { $in: roleNames } }).select("_id name role employeeId");
};

/**
 * Helper to notify all Admins and HR (Authorized Users)
 */
const notifyAdmins = async (title, message, link) => {
  try {
    // 1. Find roles that have 'APPROVE_REQUESTS' or 'ALL' permission
    const authorizedRoles = await Master.find({
      type: 'ROLE',
      permissions: { $in: ['APPROVE_REQUESTS', 'ALL'] }
    }).select('name');

    const roleNames = authorizedRoles.map(r => r.name);

    // 2. Add 'Admin' as it always has 'ALL' permission
    if (!roleNames.includes("Admin")) roleNames.push("Admin");

    // 3. Find users with these roles
    const admins = await User.find({ role: { $in: roleNames } });

    for (const admin of admins) {
      await createNotification({
        recipient: admin._id,
        title,
        message,
        type: "REQUEST",
        link
      });
    }
  } catch (error) {
    console.error("Notify Admins Error:", error);
  }
};

const notifyFinanceApprovers = async (title, message, link, designatedFinanceManager = null) => {
  try {
    if (designatedFinanceManager) {
      await createNotification({
        recipient: designatedFinanceManager,
        title,
        message,
        type: "REQUEST",
        link
      });
      return;
    }

    const authorizedRoles = await Master.find({
      type: "ROLE",
      permissions: { $in: ["APPROVE_FINANCE_REQUESTS", "ALL"] }
    }).select("name");

    const roleNames = authorizedRoles.map((r) => r.name);
    if (!roleNames.includes("Finance Manager")) {
      roleNames.push("Finance Manager");
    }

    const financeApprovers = await User.find({ role: { $in: roleNames } }).select("_id");
    for (const approver of financeApprovers) {
      await createNotification({
        recipient: approver._id,
        title,
        message,
        type: "REQUEST",
        link
      });
    }
  } catch (error) {
    console.error("Notify Finance Approvers Error:", error);
  }
};

const markLeaveAttendance = async (userId, fromDate, toDate, leaveType = null, isPaid = true, isHalfDay = false, leavePayStatus = "FULLY_PAID") => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const employee = await Employee.findOne({ email: user.email });
  if (!employee) {
    throw new Error("Employee not found for leave request");
  }

  const start = new Date(fromDate);
  const end = new Date(toDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];

    await Attendance.findOneAndUpdate(
      { employee: employee._id, date: dateStr },
      {
        employee: employee._id,
        date: dateStr,
        status: "On Leave",
        checkIn: null,
        checkOut: null,
        workHours: isHalfDay ? "0.5 days" : null,
        shift: "Day Shift",
        leaveType,
        isPaid,
        leavePayStatus,
        leaveDuration: isHalfDay ? 0.5 : 1
      },
      { upsert: true, new: true }
    );
  }
};

// Generate next request ID (REQ001, REQ002, etc.)
const generateRequestId = async () => {
  const lastRequest = await Request.findOne().sort({ requestId: -1 });

  if (!lastRequest || !lastRequest.requestId) {
    return "REQ001";
  }

  const lastNumber = parseInt(lastRequest.requestId.replace("REQ", ""));
  const nextNumber = lastNumber + 1;
  return `REQ${nextNumber.toString().padStart(3, "0")}`;
};

// ✅ UPDATED: Get request type label for emails
const getRequestTypeLabel = (request) => {
  if (request.requestType === "SALARY") {
    // Check details.subType (fallback to root subType for legacy)
    const type = request.details?.subType || request.subType;
    return type === "loan" ? "Loan Application" : "Salary Advance";
  }
  return request.requestType;
};

// ✅ UPDATED: Email helper functions with dynamic subject lines
const sendSalaryAdvanceSubmissionEmail = async (request, employeeUser) => {
  try {
    if (!process.env.SMTP_EMAIL || !process.env.SMTP_APP_PASSWORD) {
      // console.error("❌ Email configuration missing");
      return;
    }

    const hrAdmins = await User.find({ role: { $in: ["HR Admin", "HR Manager", "Admin"] } });
    const financeTeam = await User.find({ role: { $in: ["Finance", "Finance Manager"] } });

    const toEmails = [
      ...hrAdmins.map(admin => admin.email),
      ...financeTeam.map(finance => finance.email)
    ].filter(email => email);

    if (toEmails.length === 0) {
      console.warn("⚠️ No HR/Finance users found, using SMTP email as fallback");
      toEmails.push(process.env.SMTP_EMAIL);
    }

    let ccEmails = [];
    if (employeeUser.employeeId) {
      const employee = await Employee.findById(employeeUser.employeeId);
      if (employee?.reportingManager) {
        const manager = await User.findById(employee.reportingManager);
        if (manager?.email) ccEmails.push(manager.email);
      }
    }

    // ✅ Dynamic subject based on subType
    const type = request.details?.subType || request.subType;
    const requestLabel = type === "loan" ? "Loan Request" : "Salary Advance Request";
    const subject = `${requestLabel} Submitted – ${employeeUser.name}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${requestLabel} Submitted</h2>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
          <p><strong>Employee Name:</strong> ${employeeUser.name}</p>
          <p><strong>Request ID:</strong> ${request.requestId}</p>
          <p><strong>Request Type:</strong> ${requestLabel}</p>
          <p><strong>Requested Amount:</strong> AED ${request.details.amount || 'N/A'}</p>
          ${type === 'loan' ? `<p><strong>Repayment Period:</strong> ${request.details.repaymentPeriod || 'N/A'}</p>` : ''}
          <p><strong>Reason:</strong> ${request.details.reason || 'N/A'}</p>
          <p><strong>Submitted Date:</strong> ${new Date(request.submittedAt).toLocaleDateString()}</p>
        </div>
        <p style="margin-top: 20px; color: #666;">Please review this request in the HRMS system.</p>
      </div>
    `;

    const emailOptions = { to: toEmails.join(', '), subject, html };
    if (ccEmails.length > 0) emailOptions.cc = ccEmails.join(', ');

    await sendEmail(emailOptions);
    // console.log(`✅ ${requestLabel} submission email sent successfully`);
  } catch (error) {
    // console.error("❌ Failed to send submission email:", error);
  }
};

const sendSalaryAdvanceApprovalEmail = async (request, employeeUser) => {
  try {
    if (!employeeUser.email) {
      console.error("❌ Employee email not found");
      return;
    }

    // ✅ Dynamic subject based on subType
    const type = request.details?.subType || request.subType;
    const requestLabel = type === "loan" ? "Loan Request" : "Salary Advance Request";
    const subject = `${requestLabel} Approved`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #28a745;">${requestLabel} Approved</h2>
        <div style="background-color: #d4edda; padding: 20px; border-radius: 5px;">
          <p><strong>Dear ${employeeUser.name},</strong></p>
          <p>Your ${requestLabel.toLowerCase()} has been approved.</p>
          <p><strong>Request ID:</strong> ${request.requestId}</p>
          <p><strong>Approved Amount:</strong> AED ${request.details.amount || 'N/A'}</p>
          ${type === 'loan' ? `<p><strong>Repayment Period:</strong> ${request.details.repaymentPeriod || 'N/A'}</p>` : ''}
          <p><strong>Effective Date:</strong> ${new Date(request.approvedAt).toLocaleDateString()}</p>
        </div>
        <p style="margin-top: 20px; color: #666;">The amount will be processed according to the company's payroll schedule.</p>
      </div>
    `;

    await sendEmail({ to: employeeUser.email, subject, html });
    // console.log(`✅ ${requestLabel} approval email sent successfully`);
  } catch (error) {
    // console.error("❌ Failed to send approval email:", error);
  }
};

const sendSalaryAdvanceRejectionEmail = async (request, employeeUser) => {
  try {
    if (!employeeUser.email) {
      console.error("❌ Employee email not found");
      return;
    }

    // ✅ Dynamic subject based on subType
    const type = request.details?.subType || request.subType;
    const requestLabel = type === "loan" ? "Loan Request" : "Salary Advance Request";
    const subject = `${requestLabel} Rejected`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc3545;">${requestLabel} Rejected</h2>
        <div style="background-color: #f8d7da; padding: 20px; border-radius: 5px;">
          <p><strong>Dear ${employeeUser.name},</strong></p>
          <p>Your ${requestLabel.toLowerCase()} has been rejected.</p>
          <p><strong>Request ID:</strong> ${request.requestId}</p>
          <p><strong>Rejection Reason:</strong> ${request.rejectionReason || 'No reason provided'}</p>
        </div>
        <p style="margin-top: 20px; color: #666;">If you have any questions, please contact HR or Finance department.</p>
      </div>
    `;

    await sendEmail({ to: employeeUser.email, subject, html });
    // console.log(`✅ ${requestLabel} rejection email sent successfully`);
  } catch (error) {
    // console.error("❌ Failed to send rejection email:", error);
  }
};

// ✅ UPDATED: Create a new request with subType support
export const createRequest = async (req, res) => {
  try {
    const { requestType, subType } = req.body;
    const details = safeJsonParse(req.body.details, req.body.details || {});
    const userId = req.user.id;

    if (!requestType || !details) {
      return res.status(400).json({
        success: false,
        message: "Request type and details are required"
      });
    }

    if (!["LEAVE", "SALARY", "DOCUMENT"].includes(requestType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request type"
      });
    }

    const employeeUser = await User.findById(userId);
    const employee = employeeUser?.employeeId
      ? await Employee.findById(employeeUser.employeeId)
      : await Employee.findOne({ email: { $regex: new RegExp(`^${employeeUser?.email || ""}$`, "i") } });

    if (requestType === "LEAVE") {
      if (!details.fromDate || !details.toDate) {
        return res.status(400).json({
          success: false,
          message: "From date and to date are required for leave requests"
        });
      }

      if (new Date(details.toDate) < new Date(details.fromDate)) {
        return res.status(400).json({
          success: false,
          message: "Leave end date cannot be earlier than start date"
        });
      }

      const numberOfDays = getLeaveDays(details);
      if (!numberOfDays) {
        return res.status(400).json({
          success: false,
          message: "Unable to calculate leave days for the selected dates"
        });
      }
      const sickLeave = isSickLeave(details);
      let storedMedicalDoc = null;

      if (req.file) {
        storedMedicalDoc = await storeUploadedFile({
          file: req.file,
          folder: "leave-medical-documents",
          preferS3: true
        });
      }

      details.numberOfDays = numberOfDays;
      details.medicalDocumentRequired = sickLeave && numberOfDays > 1;
      details.hasMedicalDocument = Boolean(storedMedicalDoc);
      details.medicalDocumentPath = storedMedicalDoc?.filePath || "";
      details.medicalDocumentUrl = storedMedicalDoc?.fileUrl || "";
      details.medicalDocumentStorage = storedMedicalDoc?.storage || "LOCAL";
      details.leavePayStatus = details.hasMedicalDocument
        ? "FULLY_PAID"
        : (sickLeave && numberOfDays > 1 ? "UNPAID_FROM_DAY_2" : "FULLY_PAID");
    }

    // ✅ Standardized subType handling
    if (requestType === "SALARY") {
      // Logic: Prefer details.subType
      const type = (details && details.subType) || subType || null;

      if (!type || !["salary_advance", "loan"].includes(type)) {
        return res.status(400).json({
          success: false,
          message: "Invalid sub type for salary request (must be 'salary_advance' or 'loan')"
        });
      }

      // Ensure details has subType set (if it came from root body)
      if (details && !details.subType) {
        details.subType = type;
      }

      const requestedAmount = Number(details.amount);
      if (Number.isFinite(requestedAmount)) {
        details.requestedAmount = details.requestedAmount ?? requestedAmount;
      }
    }

    const requestId = await generateRequestId();
    const managerUser = requestType === "LEAVE" ? await resolveManagerRecipient(employee) : null;
    const financeUser = requestType === "SALARY" ? await resolveFinanceRecipient(employee) : null;
    const requiresManagerApproval = requestType === "LEAVE" && Boolean(managerUser?._id);
    const requiresFinanceApproval = requestType === "SALARY" && Boolean(financeUser?._id);

    const request = await Request.create({
      userId,
      requestId,
      requestType,
      details,
      designatedManager: managerUser?._id || null,
      designatedFinanceManager: financeUser?._id || null,
      currentApprovalStage: requiresManagerApproval ? "MANAGER" : (requiresFinanceApproval ? "FINANCE" : "HR"),
      managerApproval: {
        status: requiresManagerApproval ? "PENDING" : "SKIPPED"
      },
      financeApproval: {
        status: requiresFinanceApproval ? "PENDING" : "SKIPPED"
      },
      hrApproval: {
        status: "PENDING"
      },
      status: "PENDING",
      submittedAt: new Date(),
      finalPayImpact: requestType === "LEAVE" && details.leavePayStatus === "UNPAID_FROM_DAY_2" ? "UNPAID" : "NONE"
    });

    // Send notifications
    if (employeeUser) {
      if (requestType === "SALARY") {
        sendSalaryAdvanceSubmissionEmail(request, employeeUser).catch(e => console.error("Email error:", e));
      }

      if (requiresManagerApproval && managerUser?._id) {
        createNotification({
          recipient: managerUser._id,
          title: "Leave request awaiting manager approval",
          message: `${employeeUser.name} submitted leave request ${request.requestId}.`,
          type: "REQUEST",
          link: "/app/requests"
        }).catch(e => console.error("Notify error:", e));
      } else if (requiresFinanceApproval && financeUser?._id) {
        notifyFinanceApprovers(
          "Salary request awaiting finance approval",
          `${employeeUser.name} submitted ${details.subType === "loan" ? "a loan request" : "a salary advance request"} (${request.requestId}).`,
          "/app/requests",
          financeUser._id
        ).catch(e => console.error("Notify error:", e));
      } else {
        notifyAdmins(
          `New ${requestType} Request`,
          `${employeeUser.name} submitted a new ${requestType.toLowerCase()} request (${request.requestId}).`,
          `/app/requests`
        ).catch(e => console.error("Notify error:", e));
      }
    }

    return res.status(201).json({
      success: true,
      message: "Request submitted successfully",
      data: request
    });
  } catch (error) {
    // console.error("Create request error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit request"
    });
  }
};

// Get all requests for the current user
export const getMyRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, status, subType } = req.query;

    const query = { userId: userId };
    if (type) query.requestType = type;

    if (status) query.status = status;
    if (subType) {
      if (type === 'SALARY') query["details.subType"] = subType;
      // Also check root subType just in case of inconsistent data? 
      // But query["$or"] = [{subType: subType}, {"details.subType": subType}] might be safer?
      // For now, let's just target details.subType as per our finding.
      else query["details.subType"] = subType;
    }

    // ✅ If type is SALARY (Loans), filter by status if provided or default to meaningful ones?
    // User asked to hide rejected/pending. So strict filter? 
    // Actually, usually headers send status. Let's check if we want to force it or allow query param.
    if (status) query.status = status;
    // If specifically for "Loans Tab" which implies active/approved loans:
    // We can rely on frontend sending ?status=APPROVED or we can filtering here.
    // Let's support the `status` query param first, then check frontend.

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await Request.countDocuments(query);

    const requests = await Request.find(query)
      .populate("approvedBy", "name role")
      .populate("withdrawnBy", "name")
      .populate("managerApproval.actedBy", "name role")
      .populate("financeApproval.actedBy", "name role")
      .populate("hrApproval.actedBy", "name role")
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-__v");

    return res.status(200).json({
      success: true,
      message: "Requests fetched successfully",
      data: requests,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    // console.error("Get my requests error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch requests"
    });
  }
};

// Withdraw a request (only for PENDING requests)
export const withdrawRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const request = await Request.findOne({ _id: id, userId });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found"
      });
    }

    if (request.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Only pending requests can be withdrawn"
      });
    }

    request.status = "WITHDRAWN";
    request.withdrawnBy = userId;
    request.withdrawnAt = new Date();
    await request.save();

    const populatedRequest = await Request.findById(request._id)
      .populate("userId", "name")
      .populate("withdrawnBy", "name");

    return res.status(200).json({
      success: true,
      message: "Request withdrawn successfully",
      data: populatedRequest
    });
  } catch (error) {
    // console.error("Withdraw request error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to withdraw request"
    });
  }
};

// Get all pending requests (ADMIN)
// Get all pending requests (ADMIN)
export const getPendingRequestsForAdmin = async (req, res) => {
  try {
    const { type, subType, status, page = 1, limit = 10 } = req.query;

    let query = {};
    const isManagerOnlyRole = req.user.role === "Manager";
    const canApproveHr = !isManagerOnlyRole && isHrApprover(req.user);
    const canApproveFinance = (
      req.user.role === "Finance Manager"
      || /^Finance/i.test(req.user.role || "")
      || req.user.permissions?.includes("APPROVE_FINANCE_REQUESTS")
      || req.user.permissions?.includes("ALL")
    );
    const canApproveManager = req.user.role === "Manager" || req.user.permissions?.includes("APPROVE_MANAGER_REQUESTS");

    // Filter by Status (Default: ALL if not specified, to match legacy behavior)
    if (status) {
      query.status = status;
    }

    // Filter by Request Type (LEAVE, SALARY, DOCUMENT)
    if (type) {
      query.requestType = type.toUpperCase();
    }

    // Filter by Sub Type (salary_advance, loan)
    // Filter by Sub Type (salary_advance, loan)
    if (subType) {
      query.$or = [
        { subType: subType },
        { "details.subType": subType }
      ];
    }

    const managerScope = [];
    if (req.user?._id) {
      managerScope.push(req.user._id);
    }
    if (req.user?.employeeId) {
      managerScope.push(req.user.employeeId);
    }

    const financeScope = [];
    if (req.user?._id) {
      financeScope.push(req.user._id);
    }
    if (req.user?.employeeId) {
      financeScope.push(req.user.employeeId);
    }

    if (!canApproveHr && !canApproveFinance) {
      query.$and = query.$and || [];
      query.$and.push({
        currentApprovalStage: "MANAGER",
        designatedManager: { $in: managerScope }
      });
    } else if (!canApproveHr && canApproveFinance) {
      query.$and = query.$and || [];
      query.$and.push({
        currentApprovalStage: "FINANCE",
        designatedFinanceManager: { $in: financeScope }
      });
    } else if (!req.query.stage) {
      const stageFilters = [{ currentApprovalStage: "HR" }];

      if (canApproveManager) {
        stageFilters.push({ currentApprovalStage: "MANAGER", designatedManager: { $in: managerScope } });
      } else if (canApproveHr) {
        stageFilters.push({ currentApprovalStage: "MANAGER" });
      }

      if (canApproveFinance) {
        stageFilters.push({ currentApprovalStage: "FINANCE", designatedFinanceManager: { $in: financeScope } });
      } else if (canApproveHr) {
        stageFilters.push({ currentApprovalStage: "FINANCE" });
      }

      query.$and = query.$and || [];
      query.$and.push({
        $or: stageFilters
      });
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const totalRequests = await Request.countDocuments(query);

    const requests = await Request.find(query)
      .populate("userId", "name email department avatar role") // Added more user details
      .populate("designatedManager", "name role")
      .populate("designatedFinanceManager", "name role")
      .populate("managerApproval.actedBy", "name role")
      .populate("financeApproval.actedBy", "name role")
      .populate("hrApproval.actedBy", "name role")
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      count: requests.length,
      limit: limitNum,
      page: pageNum,
      totalPages: Math.ceil(totalRequests / limitNum),
      totalDocs: totalRequests,
      data: requests
    });
  } catch (error) {
    // console.error("Admin pending requests error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending requests",
      error: error.message
    });
  }
};


// Update request status (Approve/Reject) - For LEAVE and SALARY requests
export const updateRequestStatus = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action, rejectionReason } = req.body;

    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    if (!["PENDING", "MANAGER_APPROVED", "FINANCE_APPROVED"].includes(request.status)) {
      return res.status(400).json({ success: false, message: "Request already processed" });
    }

    if (request.userId?.toString() === req.user._id?.toString() || request.userId?.toString() === req.user.id?.toString()) {
      return res.status(403).json({ success: false, message: "You cannot approve or reject your own request." });
    }

    const isManagerStage = request.currentApprovalStage === "MANAGER";
    const isFinanceStage = request.currentApprovalStage === "FINANCE";
    const canApproveHr = isHrApprover(req.user);
    const canApproveManager = isManagerApprover(req.user, request);
    const canApproveFinance = isFinanceApprover(req.user, request);
    let salaryChangeNotification = null;

    if (isManagerStage && !canApproveManager) {
      return res.status(403).json({ success: false, message: "Waiting for manager approval. Only the designated manager can act on this request." });
    }

    if (isFinanceStage && !canApproveFinance) {
      return res.status(403).json({ success: false, message: "Waiting for finance approval. Only the designated finance manager can act on this request." });
    }

    if (!isManagerStage && !isFinanceStage && !canApproveHr) {
      return res.status(403).json({ success: false, message: "HR approval pending. Only HR/Admin can act on this request." });
    }

    if (action === "APPROVE") {
      if (isManagerStage) {
        request.managerApproval = {
          status: "APPROVED",
          actedBy: req.user.id,
          actedAt: new Date(),
          remarks: req.body.remarks || ""
        };
        request.currentApprovalStage = "HR";
        request.status = "MANAGER_APPROVED";
        await request.save();

        await notifyAdmins(
          "Leave request awaiting HR approval",
          `Request ${request.requestId} has been approved by the manager and is awaiting HR approval.`,
          "/app/requests"
        );

        // Notify the employee that the manager approved
        try {
          await createNotification({
            recipient: request.userId,
            title: "Manager Approved Request",
            message: `Your request ${request.requestId} has been approved by your manager and forwarded to HR.`,
            type: "REQUEST",
            link: "/app/requests"
          });
        } catch (notifErr) {
          console.error("Failed to notify employee of manager approval:", notifErr);
        }

        return res.json({
          success: true,
          message: "Request approved by manager and forwarded to HR",
          data: request
        });
      }

      if (isFinanceStage) {
        const financeAmountProvided = req.body.amount !== undefined && req.body.amount !== null && req.body.amount !== "";
        const financeRepaymentProvided = req.body.repaymentPeriod !== undefined && req.body.repaymentPeriod !== null && req.body.repaymentPeriod !== "";

        if (request.requestType === "SALARY") {
          const requestedAmount = Number(request.details?.requestedAmount ?? request.details?.amount) || 0;
          request.details = {
            ...request.details,
            requestedAmount,
            financeApprovedAmount: financeAmountProvided
              ? Number(req.body.amount)
              : Number(request.details?.financeApprovedAmount ?? request.details?.amount ?? 0),
            financeApprovedRepaymentPeriod: financeRepaymentProvided
              ? Number(req.body.repaymentPeriod)
              : request.details?.financeApprovedRepaymentPeriod ?? request.details?.repaymentPeriod,
            financeApprovedAt: new Date(),
            financeApprovedBy: req.user.id
          };
        }

        request.financeApproval = {
          status: "APPROVED",
          actedBy: req.user.id,
          actedAt: new Date(),
          remarks: req.body.remarks || ""
        };
        request.currentApprovalStage = "HR";
        request.status = "FINANCE_APPROVED";
        await request.save();

        await notifyAdmins(
          "Salary request awaiting HR approval",
          `Request ${request.requestId} has been approved by finance and is awaiting HR approval.`,
          "/app/requests"
        );

        try {
          await createNotification({
            recipient: request.userId,
            title: "Finance approved request",
            message: `Your ${request.details?.subType === "loan" ? "loan" : "salary advance"} request ${request.requestId} has been approved by finance and forwarded to HR.`,
            type: "REQUEST",
            link: "/app/requests"
          });
        } catch (notifErr) {
          console.error("Failed to notify employee of finance approval:", notifErr);
        }

        return res.json({
          success: true,
          message: "Request approved by finance and forwarded to HR",
          data: request
        });
      }

      if (request.requestType === "SALARY") {
        const previousAmount = Number(request.details?.amount) || 0;
        const previousRepaymentPeriod = request.details?.repaymentPeriod;
        const approvedAmount = req.body.amount !== undefined && req.body.amount !== null && req.body.amount !== ""
          ? Number(req.body.amount)
          : Number(request.details?.financeApprovedAmount ?? request.details?.amount ?? 0);

        request.details.amount = approvedAmount;

        const principal = Number(request.details.amount) || 0;
        const totalRepayment = principal;

        request.details = {
          ...request.details,
          interestRate: 0,
          totalRepaymentAmount: totalRepayment
        };

        const approvedRepaymentPeriod = req.body.repaymentPeriod !== undefined && req.body.repaymentPeriod !== null && req.body.repaymentPeriod !== ""
          ? Number(req.body.repaymentPeriod)
          : request.details?.financeApprovedRepaymentPeriod;

        if (approvedRepaymentPeriod) {
          request.details.repaymentPeriod = Number(approvedRepaymentPeriod);
        }

        const startCurrentCycle = req.body.startCurrentCycle === true || req.body.startCurrentCycle === "true";
        const startCycle = startCurrentCycle
          ? {
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear()
          }
          : getNextPayrollCycle();

        request.details = {
          ...request.details,
          deductionStartMonth: startCycle.month,
          deductionStartYear: startCycle.year,
          repaymentScheduleOverrides: getScheduleOverrides(request.details)
        };

        salaryChangeNotification = {
          previousAmount,
          newAmount: principal,
          previousRepaymentPeriod,
          newRepaymentPeriod: request.details.repaymentPeriod,
          startMonth: request.details.deductionStartMonth,
          startYear: request.details.deductionStartYear
        };
      }

      request.hrApproval = {
        status: "APPROVED",
        actedBy: req.user.id,
        actedAt: new Date(),
        remarks: req.body.remarks || ""
      };
      request.currentApprovalStage = "COMPLETED";
      request.status = "APPROVED";
      request.approvedBy = req.user.id;
      request.approvedAt = new Date();

      if (request.requestType === "LEAVE") {
        const { fromDate, toDate, leaveType, isPaid, isHalfDay, leavePayStatus } = request.details;
        if (fromDate && toDate) {
          await markLeaveAttendance(
            request.userId,
            fromDate,
            toDate,
            leaveType,
            isPaid,
            isHalfDay,
            leavePayStatus === "HALF_PAID" ? "HALF_PAID" : (leavePayStatus === "UNPAID" ? "UNPAID" : "FULLY_PAID")
          );
        }
      }
    } else if (action === "REJECT") {
      if (!rejectionReason || !rejectionReason.trim()) {
        return res.status(400).json({ success: false, message: "Rejection reason is required" });
      }
      if (isManagerStage) {
        request.managerApproval = {
          status: "REJECTED",
          actedBy: req.user.id,
          actedAt: new Date(),
          remarks: rejectionReason.trim()
        };
      } else if (isFinanceStage) {
        request.financeApproval = {
          status: "REJECTED",
          actedBy: req.user.id,
          actedAt: new Date(),
          remarks: rejectionReason.trim()
        };
      } else {
        request.hrApproval = {
          status: "REJECTED",
          actedBy: req.user.id,
          actedAt: new Date(),
          remarks: rejectionReason.trim()
        };
      }
      request.rejectionReason = rejectionReason.trim();
      request.status = "REJECTED";
      request.currentApprovalStage = "COMPLETED";
      request.approvedBy = req.user.id;
      request.approvedAt = new Date();
    } else {
      return res.status(400).json({ success: false, message: "Invalid action" });
    }

    await request.save();

    // Notify Employee
    const salaryNotification = request.requestType === "SALARY" && action === "APPROVE" && salaryChangeNotification
      ? (() => {
        const change = salaryChangeNotification;
        const label = request.details?.subType === "loan" ? "loan" : "salary advance";
        const changes = [
          `approved amount AED ${Number(change.newAmount || 0).toFixed(2)}`,
          `repayment period ${change.newRepaymentPeriod || "N/A"} month(s)`,
          `deduction starts ${formatPayrollCycle(change.startMonth, change.startYear)}`
        ];
        if (Number(change.previousAmount) !== Number(change.newAmount)) {
          changes.unshift(`amount changed from AED ${Number(change.previousAmount || 0).toFixed(2)} to AED ${Number(change.newAmount || 0).toFixed(2)}`);
        }
        if (change.previousRepaymentPeriod && Number(change.previousRepaymentPeriod) !== Number(change.newRepaymentPeriod)) {
          changes.push(`tenure changed from ${change.previousRepaymentPeriod} to ${change.newRepaymentPeriod} month(s)`);
        }
        return `Your ${label} request (${request.requestId}) was approved by ${req.user.name || "HR/Admin"}: ${changes.join(", ")}.`;
      })()
      : `Your ${request.requestType.toLowerCase()} request (${request.requestId}) has been ${request.status.toLowerCase()}.`;

    createNotification({
      recipient: request.userId,
      title: request.requestType === "SALARY" && action === "APPROVE" ? "Salary request approved" : `Request ${request.status}`,
      message: salaryNotification,
      type: "REQUEST",
      link: "/app/requests"
    }).catch(e => console.error("Notification error:", e));

    // Send email notifications for Salary Advance/Loan requests
    if (request.requestType === "SALARY") {
      const employeeUser = await User.findById(request.userId);
      if (employeeUser) {
        if (action === "APPROVE") {
          sendSalaryAdvanceApprovalEmail(request, employeeUser).catch(e => console.error("Email error:", e));
        } else if (action === "REJECT") {
          sendSalaryAdvanceRejectionEmail(request, employeeUser).catch(e => console.error("Email error:", e));
        }
      }
    }

    const populatedRequest = await Request.findById(request._id)
      .populate("approvedBy", "name role")
      .populate("managerApproval.actedBy", "name role")
      .populate("financeApproval.actedBy", "name role")
      .populate("hrApproval.actedBy", "name role");

    res.json({
      success: true,
      message: `Request ${request.status.toLowerCase()} successfully`,
      data: populatedRequest
    });

    logActivity({
      req,
      action: action === "APPROVE" ? "APPROVE" : "REJECT",
      module: "REQUESTS",
      description: `${request.requestType} request ${request.requestId} ${request.status.toLowerCase()} by ${req.user?.name}`,
      targetId: request._id,
      targetName: request.requestId
    }).catch(() => {});
  } catch (err) {
    // console.error("❌ Update request error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateSalaryRepaymentSchedule = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action, month, year, reason = "" } = req.body;

    const canManageSchedule = req.user.role === "Admin"
      || req.user.permissions?.includes("ALL")
      || req.user.permissions?.includes("APPROVE_REQUESTS");

    if (!canManageSchedule) {
      return res.status(403).json({
        success: false,
        message: "Only HR/Admin can update repayment schedules."
      });
    }

    if (action !== "SKIP_MONTH") {
      return res.status(400).json({
        success: false,
        message: "Invalid repayment schedule action."
      });
    }

    const cycle = parsePayrollCycle(month, year);
    if (!cycle) {
      return res.status(400).json({
        success: false,
        message: "A valid payroll month and year are required."
      });
    }

    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found"
      });
    }

    if (request.requestType !== "SALARY") {
      return res.status(400).json({
        success: false,
        message: "Only loan and salary advance requests support repayment scheduling."
      });
    }

    if (request.status !== "APPROVED") {
      return res.status(400).json({
        success: false,
        message: "Repayment schedule can only be updated for approved requests."
      });
    }

    if (request.isFullyPaid) {
      return res.status(400).json({
        success: false,
        message: "This request is already fully repaid."
      });
    }

    const existingDeductions = Array.isArray(request.payrollDeductions) ? request.payrollDeductions : [];
    const alreadyDeducted = existingDeductions.some((entry) =>
      Number(entry.month) === cycle.month && Number(entry.year) === cycle.year
    );

    if (alreadyDeducted) {
      return res.status(400).json({
        success: false,
        message: "This payroll cycle was already deducted and cannot be skipped."
      });
    }

    const details = request.details || {};
    const scheduleOverrides = getScheduleOverrides(details);
    const alreadySkipped = scheduleOverrides.some((entry) =>
      entry?.action === "SKIP"
      && Number(entry.month) === cycle.month
      && Number(entry.year) === cycle.year
    );

    if (alreadySkipped) {
      return res.status(400).json({
        success: false,
        message: "A skip is already scheduled for this payroll cycle."
      });
    }

    request.details = {
      ...details,
      repaymentScheduleOverrides: [
        ...scheduleOverrides,
        {
          action: "SKIP",
          month: cycle.month,
          year: cycle.year,
          reason: reason.trim(),
          addedBy: req.user._id,
          addedAt: new Date()
        }
      ]
    };

    await request.save();

    createNotification({
      recipient: request.userId,
      title: "Loan deduction rescheduled",
      message: `A repayment skip was added for ${String(cycle.month).padStart(2, "0")}/${cycle.year} on request ${request.requestId}. Deductions will resume automatically after that cycle.`,
      type: "REQUEST",
      link: "/app/requests"
    }).catch((error) => console.error("Notification error:", error));

    const populatedRequest = await Request.findById(request._id)
      .populate("approvedBy", "name role")
      .populate("managerApproval.actedBy", "name role")
      .populate("financeApproval.actedBy", "name role")
      .populate("hrApproval.actedBy", "name role");

    return res.status(200).json({
      success: true,
      message: `Repayment skip added for ${String(cycle.month).padStart(2, "0")}/${cycle.year}.`,
      data: populatedRequest
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update repayment schedule"
    });
  }
};

// ✅ NEW: Approve Document Request with file upload
export const approveDocumentRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Document file is required"
      });
    }

    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found"
      });
    }

    if (request.requestType !== "DOCUMENT") {
      return res.status(400).json({
        success: false,
        message: "This endpoint is only for document requests"
      });
    }

    if (request.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Request already processed"
      });
    }

    const storedFile = await storeUploadedFile({
      file: req.file,
      folder: "document-requests",
      preferS3: true
    });

    request.status = "COMPLETED";
    request.currentApprovalStage = "COMPLETED";
    request.uploadedDocument = storedFile.filePath;
    request.uploadedDocumentUrl = storedFile.fileUrl;
    request.uploadedDocumentStorage = storedFile.storage;
    request.uploadedAt = new Date();
    request.actionBy = req.user.id;
    request.actionDate = new Date();
    request.approvedBy = req.user.id;
    request.approvedAt = new Date();
    request.hrApproval = {
      status: "APPROVED",
      actedBy: req.user.id,
      actedAt: new Date(),
      remarks: req.body.remarks || ""
    };

    await request.save();

    // Notify Employee
    createNotification({
      recipient: request.userId,
      title: `Request Completed`,
      message: `Your document request (${request.requestId}) has been completed and the document is ready.`,
      type: "REQUEST",
      link: "/app/requests"
    }).catch(e => console.error("Notification error:", e));

    const populatedRequest = await Request.findById(request._id)
      .populate("userId", "name")
      .populate("approvedBy", "name role")
      .populate("actionBy", "name role");

    res.json({
      success: true,
      message: "Document request approved and document uploaded successfully",
      data: populatedRequest
    });
  } catch (err) {
    // console.error("❌ Approve document request error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to approve document request"
    });
  }
};

// ✅ NEW: Reject Document Request
export const rejectDocumentRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason || !rejectionReason.trim()) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required"
      });
    }

    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found"
      });
    }

    if (request.requestType !== "DOCUMENT") {
      return res.status(400).json({
        success: false,
        message: "This endpoint is only for document requests"
      });
    }

    if (request.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Request already processed"
      });
    }

    request.status = "REJECTED";
    request.currentApprovalStage = "COMPLETED";
    request.rejectionReason = rejectionReason.trim();
    request.actionBy = req.user.id;
    request.actionDate = new Date();
    request.approvedBy = req.user.id;
    request.approvedAt = new Date();
    request.hrApproval = {
      status: "REJECTED",
      actedBy: req.user.id,
      actedAt: new Date(),
      remarks: rejectionReason.trim()
    };

    await request.save();

    // Notify Employee
    createNotification({
      recipient: request.userId,
      title: `Request Rejected`,
      message: `Your document request (${request.requestId}) has been rejected.`,
      type: "REQUEST",
      link: "/app/requests"
    }).catch(e => console.error("Notification error:", e));

    const populatedRequest = await Request.findById(request._id)
      .populate("userId", "name")
      .populate("approvedBy", "name role")
      .populate("actionBy", "name role");

    res.json({
      success: true,
      message: "Document request rejected successfully",
      data: populatedRequest
    });
  } catch (err) {
    // console.error("❌ Reject document request error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to reject document request"
    });
  }
};

// ✅ NEW: Download Document
export const downloadDocument = async (req, res) => {
  try {
    const { requestId } = req.params;

    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found"
      });
    }

    if (!request.uploadedDocument) {
      return res.status(404).json({
        success: false,
        message: "No document available for download"
      });
    }

    // Check if file exists
    if (request.uploadedDocumentStorage === "LOCAL" && !fs.existsSync(request.uploadedDocument)) {
      return res.status(404).json({
        success: false,
        message: "Document file not found on server"
      });
    }

    if (request.uploadedDocumentStorage === "S3") {
      const exists = await s3ObjectExists(request.uploadedDocument);
      if (!exists) {
        return res.status(404).json({
          success: false,
          message: "The document file no longer exists. It may have been deleted or moved. Please contact HR to re-upload the document."
        });
      }
      return res.redirect(await getSignedFileUrl({
        filePath: request.uploadedDocument,
        fileUrl: request.uploadedDocumentUrl,
        storage: request.uploadedDocumentStorage
      }));
    }

    // Get file extension and set appropriate content type
    const fileExt = path.extname(request.uploadedDocument).toLowerCase();
    let contentType = 'application/octet-stream';

    if (fileExt === '.pdf') {
      contentType = 'application/pdf';
    } else if (fileExt === '.jpg' || fileExt === '.jpeg') {
      contentType = 'image/jpeg';
    } else if (fileExt === '.png') {
      contentType = 'image/png';
    }

    // Set headers for file download
    const fileName = `document-${request.requestId}${fileExt}`;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    // Stream the file
    const fileStream = fs.createReadStream(request.uploadedDocument);
    fileStream.pipe(res);
  } catch (err) {
    // console.error("❌ Download document error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to download document"
    });
  }
};

// ✅ NEW: Get requests for a specific employee
export const getEmployeeRequests = async (req, res) => {
  try {
    const { employeeId } = req.params;
    console.log(`[getEmployeeRequests] Fetching for Employee ID: ${employeeId}`);

    // Access Control: Allow if Self OR has Permission
    let isSelf = req.user.employeeId && req.user.employeeId.toString() === employeeId;

    // Fallback: If ID link is missing, verify identity via Email
    if (!isSelf) {
      const targetEmployee = await Employee.findById(employeeId);
      if (targetEmployee && targetEmployee.email && req.user.email) {
        if (targetEmployee.email.trim().toLowerCase() === req.user.email.trim().toLowerCase()) {
          isSelf = true;
        }
      }
    }

    const canManage = req.user.role === 'Admin' || (req.user.permissions && req.user.permissions.includes("MANAGE_EMPLOYEES"));

    if (!isSelf && !canManage) {
      return res.status(403).json({
        success: false,
        message: "Access Denied: You can only view your own requests."
      });
    }

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      console.warn(`[getEmployeeRequests] Invalid Employee ID format: ${employeeId}`);
      return res.status(400).json({ success: false, message: "Invalid Employee ID format" });
    }

    // 1. Try to find User via explicit employeeId link
    let user = await User.findOne({ employeeId });
    console.log(`[getEmployeeRequests] User via direct link: ${user ? user._id : 'Not Found'}`);

    // 2. Fallback: If no direct link, find Employee by ID -> User by Email
    if (!user) {
      const employee = await Employee.findById(employeeId);
      if (employee) {
        console.log(`[getEmployeeRequests] Found Employee: ${employee.email}`);
        if (employee.email) {
          // Case-insensitive email lookup
          user = await User.findOne({
            email: { $regex: new RegExp(`^${employee.email}$`, 'i') }
          });
          console.log(`[getEmployeeRequests] User via Email Link: ${user ? user._id : 'Not Found'}`);
        }
      } else {
        console.log(`[getEmployeeRequests] Employee not found in DB`);
      }
    }

    if (!user) {
      // If still no user, we can't find requests because they are keyed by User ID
      console.warn(`[getEmployeeRequests] No User account found for this employee.`);
      return res.status(200).json({
        success: true,
        data: [] // Return empty array instead of 404 to gracefully handle no-user scenarios
      });
    }

    const { type, status } = req.query;

    const query = { userId: user._id };
    if (type) query.requestType = type;

    if (status) {
      if (status.includes(',')) {
        query.status = { $in: status.split(',') };
      } else {
        query.status = status;
      }
    }

    const requests = await Request.find(query)
      .populate("approvedBy", "name role")
      .populate("withdrawnBy", "name")
      .populate("managerApproval.actedBy", "name role")
      .populate("financeApproval.actedBy", "name role")
      .populate("hrApproval.actedBy", "name role")
      .sort({ submittedAt: -1 });

    console.log(`[getEmployeeRequests] Found ${requests.length} requests`);

    res.status(200).json({
      success: true,
      data: requests
    });
  } catch (error) {
    console.error("Get employee requests error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch employee requests"
    });
  }
};

/**
 * GET /api/requests/leave-summary
 * Returns leave type breakdown for current user (or admin can query any userId)
 */
export const getLeaveSummary = async (req, res) => {
  try {
    const { userId: queryUserId, employeeId, year } = req.query;

    let targetUserId = req.user._id;

    if (employeeId) {
      const targetEmployee = await Employee.findById(employeeId);
      if (!targetEmployee) {
        return res.status(404).json({ success: false, message: "Employee not found" });
      }

      const isSelf = req.user.employeeId && req.user.employeeId.toString() === targetEmployee._id.toString();
      const canViewAll = isHrApprover(req.user);
      const isAssignedManager = targetEmployee.designatedManager && (
        targetEmployee.designatedManager.toString() === req.user._id.toString()
        || (req.user.employeeId && targetEmployee.designatedManager.toString() === req.user.employeeId.toString())
      );

      if (!isSelf && !canViewAll && !isAssignedManager) {
        return res.status(403).json({ success: false, message: "You do not have access to this leave summary" });
      }

      const targetUser = await User.findOne({
        $or: [
          { employeeId: targetEmployee._id },
          { email: { $regex: new RegExp(`^${escapeRegex(targetEmployee.email)}$`, "i") } }
        ]
      }).select("_id");

      targetUserId = targetUser?._id || null;
    } else if (queryUserId && isHrApprover(req.user)) {
      targetUserId = queryUserId;
    }

    if (!targetUserId) {
      return res.json({
        success: true,
        data: [],
        totals: {
          sick: 0,
          casual: 0,
          annual: 0,
          unpaid: 0,
          approvedDays: 0,
          pendingRequests: 0
        },
        totalDays: 0,
        totalRequests: 0
      });
    }

    const matchQuery = {
      userId: targetUserId,
      requestType: "LEAVE",
      status: "APPROVED"
    };

    // Filter by year if provided
    if (year) {
      const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
      const endOfYear = new Date(`${year}-12-31T23:59:59.999Z`);
      matchQuery.createdAt = { $gte: startOfYear, $lte: endOfYear };
    }

    const leaveRequests = await Request.find(matchQuery);
    const pendingRequests = await Request.countDocuments({
      userId: targetUserId,
      requestType: "LEAVE",
      status: { $in: ["PENDING", "MANAGER_APPROVED"] }
    });

    // Aggregate by leave type
    const summary = {};
    let totalDays = 0;

    for (const req of leaveRequests) {
      const details = req.details || {};
      const leaveType = details.leaveType || details.leaveTypeId || "Other";
      const days = parseFloat(details.numberOfDays || 1);

      if (!summary[leaveType]) {
        summary[leaveType] = { type: leaveType, count: 0, totalDays: 0 };
      }
      summary[leaveType].count += 1;
      summary[leaveType].totalDays += days;
      totalDays += days;
    }

    const totals = Object.values(summary).reduce((acc, item) => {
      const normalized = String(item.type || "").toLowerCase();
      if (normalized.includes("sick")) acc.sick += item.totalDays;
      else if (normalized.includes("casual")) acc.casual += item.totalDays;
      else if (normalized.includes("annual")) acc.annual += item.totalDays;
      else if (normalized.includes("unpaid")) acc.unpaid += item.totalDays;
      acc.approvedDays += item.totalDays;
      return acc;
    }, { sick: 0, casual: 0, annual: 0, unpaid: 0, approvedDays: 0, pendingRequests });

    res.json({
      success: true,
      data: Object.values(summary),
      totals,
      totalDays,
      totalRequests: leaveRequests.length
    });
  } catch (error) {
    console.error("Get leave summary error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch leave summary" });
  }
};
