import Request from "../models/requestModel.js";
import Employee from "../models/employeeModel.js";
import Attendance from "../models/attendanceModel.js";
import User from "../models/userModel.js";


// Helper: Mark attendance as "On Leave" for a date range
// const markLeaveAttendance = async (employeeId, fromDate, toDate) => {
//   const start = new Date(fromDate);
//   const end = new Date(toDate);

//   for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
//     const dateStr = d.toISOString().split("T")[0]; // YYYY-MM-DD

//     await Attendance.findOneAndUpdate(
//       { employee: employeeId, date: dateStr },
//       {
//         employee: employeeId,
//         date: dateStr,
//         status: "On Leave",
//         shift: "Day Shift", // default shift
//         checkIn: null,
//         checkOut: null,
//         workHours: null
//       },
//       { upsert: true, new: true }
//     );
//   }
// };



// ✅ Helper: Mark attendance as "On Leave" for a date range
// const markLeaveAttendance = async (userId, fromDate, toDate) => {
//   // Step 1: find Employee linked to this user
//   const employee = await Employee.findOne({ user: userId });
//   if (!employee) throw new Error("Employee not found for leave request");

//   const start = new Date(fromDate);
//   const end = new Date(toDate);

//   for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
//     const dateStr = d.toISOString().split("T")[0]; // YYYY-MM-DD

//     await Attendance.findOneAndUpdate(
//       { employee: employee._id, date: dateStr }, // use Employee _id
//       {
//         employee: employee._id,
//         date: dateStr,
//         status: "On Leave",
//         shift: "Day Shift", // default shift
//         checkIn: null,
//         checkOut: null,
//         workHours: null
//       },
//       { upsert: true, new: true }
//     );
//   }
// };


const markLeaveAttendance = async (userId, fromDate, toDate) => {
  // 1️⃣ Get user
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  // 2️⃣ Find employee using email bridge
  const employee = await Employee.findOne({ email: user.email });
  if (!employee) {
    throw new Error("Employee not found for leave request");
  }

  // 3️⃣ Loop through leave date range
  const start = new Date(fromDate);
  const end = new Date(toDate);

  for (
    let d = new Date(start);
    d <= end;
    d.setDate(d.getDate() + 1)
  ) {
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
        shift: "Day Shift"
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

// Create a new request
export const createRequest = async (req, res) => {
  try {
    const { requestType, details } = req.body;
    const userId = req.user.id;

    // Validation
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

    // Generate request ID
    const requestId = await generateRequestId();

    // Create request
    const request = await Request.create({
      userId,
      requestId,
      requestType,
      details,
      status: "PENDING",
      submittedAt: new Date()
    });

    return res.status(201).json({
      success: true,
      message: "Request submitted successfully",
      data: request
    });
  } catch (error) {
    console.error("Create request error:", error);
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

    // const requests = await Request.find({ userId })
    //   .sort({ submittedAt: -1 }) // Latest first
    //   .select("-__v");

    const requests = await Request.find({ userId })
  .populate("approvedBy", "name role") // ✅ ADD THIS LINE
  .sort({ submittedAt: -1 })
  .select("-__v");

    

    return res.status(200).json({
      success: true,
      message: "Requests fetched successfully",
      data: requests
    });
  } catch (error) {
    console.error("Get my requests error:", error);
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
    await request.save();

    return res.status(200).json({
      success: true,
      message: "Request withdrawn successfully",
      data: request
    });
  } catch (error) {
    console.error("Withdraw request error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to withdraw request"
    });
  }
};




export const getPendingRequestsForAdmin = async (req, res) => {
  try {
    const requests = await Request.find({ status: "PENDING" })
      .populate({
        path: "userId",
        populate: {
          path: "employeeId",
          select: "name code"
        }
      })
      .sort({ submittedAt: -1 });

    res.status(200).json({
      success: true,
      data: requests
    });
  } catch (error) {
    console.error("Admin pending requests error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending requests"
    });
  }
};


export const updateRequestStatus = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action, remarks } = req.body; // action = APPROVE / REJECT

    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    // Decide final status
    let newStatus = "REJECTED";

    if (action === "APPROVE") {
      if (request.requestType === "DOCUMENT") {
        newStatus = "COMPLETED";
      } else {
        newStatus = "APPROVED";
      }
    }

    request.status = newStatus;
    request.remarks = remarks || "";
    request.approvedBy = req.user._id; // HR/Admin
    request.approvedAt = new Date();

    // Only mark leave attendance if request is LEAVE and approved
// if (request.requestType === "LEAVE" && action === "APPROVE") {
//   const { fromDate, toDate } = request.details;
//   if (fromDate && toDate) {
//     await markLeaveAttendance(request.userId, fromDate, toDate);
//   }
// }


if (request.requestType === "LEAVE" && action === "APPROVE") {
  const { fromDate, toDate } = request.details;
  if (fromDate && toDate) {
    // call with userId
    await markLeaveAttendance(request.userId, fromDate, toDate);
  }
}



    await request.save();

    res.json({
      success: true,
      message: `Request ${newStatus.toLowerCase()} successfully`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


