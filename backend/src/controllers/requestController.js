import Request from "../models/requestModel.js";

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

    const requests = await Request.find({ userId })
      .sort({ submittedAt: -1 }) // Latest first
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

