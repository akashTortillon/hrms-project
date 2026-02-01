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
import { sendEmail } from "../utils/sendEmail.js";
import { createNotification } from "./notificationController.js";
import upload from "../config/multer.js";
import path from "path";
import fs from "fs";
import mongoose from "mongoose";

/**
 * Helper to notify all Admins and HR
 */
const notifyAdmins = async (title, message, link) => {
  const admins = await User.find({ role: { $in: ["Admin", "HR Admin", "HR Manager"] } });
  for (const admin of admins) {
    await createNotification({
      recipient: admin._id,
      title,
      message,
      type: "REQUEST",
      link
    });
  }
};

const markLeaveAttendance = async (userId, fromDate, toDate, leaveType = null, isPaid = true) => {
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
        workHours: null,
        shift: "Day Shift",
        leaveType,
        isPaid
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
    return request.subType === "loan" ? "Loan Application" : "Salary Advance";
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

    const hrAdmins = await User.find({ role: { $in: ["HR Admin", "Admin"] } });
    const financeTeam = await User.find({ role: "Finance" });

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
    const requestLabel = request.subType === "loan" ? "Loan Request" : "Salary Advance Request";
    const subject = `${requestLabel} Submitted – ${employeeUser.name}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${requestLabel} Submitted</h2>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
          <p><strong>Employee Name:</strong> ${employeeUser.name}</p>
          <p><strong>Request ID:</strong> ${request.requestId}</p>
          <p><strong>Request Type:</strong> ${requestLabel}</p>
          <p><strong>Requested Amount:</strong> AED ${request.details.amount || 'N/A'}</p>
          <p><strong>Repayment Period:</strong> ${request.details.repaymentPeriod || 'N/A'}</p>
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
    const requestLabel = request.subType === "loan" ? "Loan Request" : "Salary Advance Request";
    const subject = `${requestLabel} Approved`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #28a745;">${requestLabel} Approved</h2>
        <div style="background-color: #d4edda; padding: 20px; border-radius: 5px;">
          <p><strong>Dear ${employeeUser.name},</strong></p>
          <p>Your ${requestLabel.toLowerCase()} has been approved.</p>
          <p><strong>Request ID:</strong> ${request.requestId}</p>
          <p><strong>Approved Amount:</strong> AED ${request.details.amount || 'N/A'}</p>
          <p><strong>Repayment Period:</strong> ${request.details.repaymentPeriod || 'N/A'}</p>
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
    const requestLabel = request.subType === "loan" ? "Loan Request" : "Salary Advance Request";
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
    const { requestType, subType, details } = req.body;
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

    // ✅ Validate subType for SALARY requests
    if (requestType === "SALARY" && subType && !["salary_advance", "loan"].includes(subType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sub type for salary request"
      });
    }

    const requestId = await generateRequestId();

    const request = await Request.create({
      userId,
      requestId,
      requestType,
      subType: requestType === "SALARY" ? subType : null,
      details,
      status: "PENDING",
      submittedAt: new Date()
    });

    // Send notifications
    const employeeUser = await User.findById(userId);
    if (employeeUser) {
      if (requestType === "SALARY") {
        await sendSalaryAdvanceSubmissionEmail(request, employeeUser);
      }

      // Notify Admins
      await notifyAdmins(
        `New ${requestType} Request`,
        `${employeeUser.name} submitted a new ${requestType.toLowerCase()} request (${request.requestId}).`,
        `/app/requests`
      );
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

    const requests = await Request.find({ userId })
      .populate("approvedBy", "name role")
      .populate("withdrawnBy", "name")
      .sort({ submittedAt: -1 })
      .select("-__v");

    return res.status(200).json({
      success: true,
      message: "Requests fetched successfully",
      data: requests
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

// Fetch ALL requests for admin
export const getPendingRequestsForAdmin = async (req, res) => {
  try {
    const requests = await Request.find({})
      .populate("userId", "name")
      .populate("withdrawnBy", "name")
      .populate("approvedBy", "name role")
      .sort({ submittedAt: -1 });

    res.status(200).json({
      success: true,
      data: requests
    });
  } catch (error) {
    // console.error("Admin pending requests error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending requests"
    });
  }
};

// Update request status (Approve/Reject) - For LEAVE and SALARY requests
export const updateRequestStatus = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action, rejectionReason, interestRate } = req.body;

    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    let newStatus = "REJECTED";

    if (action === "APPROVE") {
      newStatus = "APPROVED";

      // Calculate Interest for Loans AND Salary Advances
      if (request.status === "PENDING" && request.requestType === "SALARY") {
        const rate = interestRate ? Number(interestRate) : 0;
        const principal = Number(request.details.amount) || 0;
        const totalRepayment = principal + (principal * rate / 100);

        // Update details with finalized terms
        request.details = {
          ...request.details,
          interestRate: rate,
          totalRepaymentAmount: totalRepayment
        };

        // Update Repayment Period if provided (Admin Override)
        if (req.body.repaymentPeriod) {
          request.details.repaymentPeriod = Number(req.body.repaymentPeriod);
        }
      }
    }

    request.status = newStatus;
    request.approvedBy = req.user.id;
    request.approvedAt = new Date();

    if (action === "REJECT" && rejectionReason) {
      request.rejectionReason = rejectionReason;
    }

    if (request.requestType === "LEAVE" && action === "APPROVE") {
      const { fromDate, toDate, leaveType, isPaid } = request.details;
      if (fromDate && toDate) {
        await markLeaveAttendance(request.userId, fromDate, toDate, leaveType, isPaid);
      }
    }

    await request.save();

    // Notify Employee
    await createNotification({
      recipient: request.userId,
      title: `Request ${newStatus}`,
      message: `Your ${request.requestType.toLowerCase()} request (${request.requestId}) has been ${newStatus.toLowerCase()}.`,
      type: "REQUEST",
      link: "/app/requests"
    });

    // Send email notifications for Salary Advance/Loan requests
    if (request.requestType === "SALARY") {
      const employeeUser = await User.findById(request.userId);
      if (employeeUser) {
        if (action === "APPROVE") {
          await sendSalaryAdvanceApprovalEmail(request, employeeUser);
        } else if (action === "REJECT") {
          await sendSalaryAdvanceRejectionEmail(request, employeeUser);
        }
      }
    }

    const populatedRequest = await Request.findById(request._id)
      .populate("approvedBy", "name role");

    res.json({
      success: true,
      message: `Request ${newStatus.toLowerCase()} successfully`,
      data: populatedRequest
    });
  } catch (err) {
    // console.error("❌ Update request error:", err);
    res.status(500).json({ success: false, message: "Server error" });
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
        message: "Only pending requests can be approved"
      });
    }

    // Update request with document info
    request.status = "COMPLETED";
    request.uploadedDocument = req.file.path;
    request.uploadedAt = new Date();
    request.actionBy = req.user.id;
    request.actionDate = new Date();
    request.approvedBy = req.user.id;
    request.approvedAt = new Date();

    await request.save();

    // Notify Employee
    await createNotification({
      recipient: request.userId,
      title: `Request Completed`,
      message: `Your document request (${request.requestId}) has been completed and the document is ready.`,
      type: "REQUEST",
      link: "/app/requests"
    });

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
        message: "Only pending requests can be rejected"
      });
    }

    request.status = "REJECTED";
    request.rejectionReason = rejectionReason.trim();
    request.actionBy = req.user.id;
    request.actionDate = new Date();
    request.approvedBy = req.user.id;
    request.approvedAt = new Date();

    await request.save();

    // Notify Employee
    await createNotification({
      recipient: request.userId,
      title: `Request Rejected`,
      message: `Your document request (${request.requestId}) has been rejected.`,
      type: "REQUEST",
      link: "/app/requests"
    });

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
    if (!fs.existsSync(request.uploadedDocument)) {
      return res.status(404).json({
        success: false,
        message: "Document file not found on server"
      });
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

    const requests = await Request.find({ userId: user._id })
      .populate("approvedBy", "name role")
      .populate("withdrawnBy", "name")
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
