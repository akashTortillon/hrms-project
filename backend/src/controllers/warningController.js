import Warning from "../models/warningModel.js";
import Employee from "../models/employeeModel.js";
import User from "../models/userModel.js";
import { createNotification } from "./notificationController.js";
import { storeUploadedFile, getSignedFileUrl } from "../utils/storage.js";

const isWarningManager = (user = {}) =>
  user.role === "Admin" ||
  /^HR/i.test(user.role || "") ||
  user.role === "Manager" ||
  user.permissions?.includes("ALL") ||
  user.permissions?.includes("MANAGE_EMPLOYEES");

const attachSignedUrl = async (warning) => {
  const item = warning.toObject ? warning.toObject() : { ...warning };
  if (item.attachmentStorage === "S3" && item.attachmentPath) {
    item.attachmentUrl = await getSignedFileUrl({
      filePath: item.attachmentPath,
      fileUrl: item.attachmentUrl,
      storage: "S3"
    });
  }
  return item;
};

// Add a warning/punishment
export const addWarning = async (req, res) => {
  try {
    if (!isWarningManager(req.user)) {
      return res.status(403).json({ message: "You do not have permission to issue warnings" });
    }

    const { employeeId, warningType, severity, subject, description, issuedDate } = req.body;

    if (!employeeId || !warningType || !subject || !description) {
      return res.status(400).json({ message: "employeeId, warningType, subject and description are required" });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    let attachmentData = {};
    if (req.file) {
      const stored = await storeUploadedFile({
        file: req.file,
        folder: "warnings",
        preferS3: true
      });
      attachmentData = {
        attachmentPath: stored.filePath,
        attachmentUrl: stored.fileUrl,
        attachmentStorage: stored.storage,
        attachmentName: req.file.originalname
      };
    }

    const warning = await Warning.create({
      employeeId,
      issuedBy: req.user._id,
      warningType,
      severity: severity || "Medium",
      subject,
      description,
      issuedDate: issuedDate ? new Date(issuedDate) : new Date(),
      ...attachmentData
    });

    // Notify the employee
    const linkedUser = await User.findOne({ employeeId });
    if (linkedUser) {
      await createNotification({
        recipient: linkedUser._id,
        title: `${warningType} Issued`,
        message: `A ${warningType.toLowerCase()} has been issued to you: "${subject}". Please check your profile for details.`,
        type: "WARNING",
        link: "/app/profile?tab=Warnings"
      }).catch(() => {});
    }

    const populated = await Warning.findById(warning._id)
      .populate("issuedBy", "name role");

    res.status(201).json({ success: true, data: await attachSignedUrl(populated) });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Get all warnings for an employee
export const getEmployeeWarnings = async (req, res) => {
  try {
    const { employeeId } = req.params;

    // Employees can only view their own warnings
    if (!isWarningManager(req.user)) {
      const linkedEmployee = await Employee.findOne({ email: req.user.email });
      if (!linkedEmployee || linkedEmployee._id.toString() !== employeeId) {
        return res.status(403).json({ message: "You can only view your own warnings" });
      }
    }

    const warnings = await Warning.find({ employeeId })
      .populate("issuedBy", "name role")
      .sort({ issuedDate: -1 });

    const withUrls = await Promise.all(warnings.map(attachSignedUrl));
    res.json({ success: true, data: withUrls });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Update warning status (acknowledge / resolve)
export const updateWarningStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolutionNote } = req.body;

    const warning = await Warning.findById(id);
    if (!warning) {
      return res.status(404).json({ message: "Warning not found" });
    }

    // Employees can only acknowledge their own warnings
    if (!isWarningManager(req.user)) {
      const linkedEmployee = await Employee.findOne({ email: req.user.email });
      if (!linkedEmployee || linkedEmployee._id.toString() !== warning.employeeId.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (status !== "Acknowledged") {
        return res.status(403).json({ message: "Employees can only acknowledge warnings" });
      }
    }

    warning.status = status;
    if (status === "Acknowledged") warning.acknowledgedAt = new Date();
    if (status === "Resolved") {
      warning.resolvedAt = new Date();
      warning.resolutionNote = resolutionNote || "";
    }

    await warning.save();
    const populated = await Warning.findById(id).populate("issuedBy", "name role");
    res.json({ success: true, data: await attachSignedUrl(populated) });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Delete a warning (HR/Admin only)
export const deleteWarning = async (req, res) => {
  try {
    if (!isWarningManager(req.user)) {
      return res.status(403).json({ message: "Access denied" });
    }
    const { id } = req.params;
    const warning = await Warning.findByIdAndDelete(id);
    if (!warning) {
      return res.status(404).json({ message: "Warning not found" });
    }
    res.json({ success: true, message: "Warning deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
