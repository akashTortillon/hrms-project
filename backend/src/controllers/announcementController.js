import Announcement from "../models/announcementModel.js";
import Employee from "../models/employeeModel.js";
import User from "../models/userModel.js";
import { createNotification } from "./notificationController.js";
import { storeUploadedFile, getSignedFileUrl } from "../utils/storage.js";

const resolveAudienceUsers = async (announcement) => {
  if (announcement.audience === "EMPLOYEE" && announcement.employeeIds?.length) {
    const employees = await Employee.find({ _id: { $in: announcement.employeeIds } }).select("email");
    return User.find({ email: { $in: employees.map((item) => item.email).filter(Boolean) } }).select("_id");
  }

  const query = {};
  if (announcement.audience === "BRANCH" && announcement.branch) query.branch = announcement.branch;
  if (announcement.audience === "COMPANY" && announcement.company) query.company = announcement.company;
  if (announcement.audience === "DEPARTMENT" && announcement.department) query.department = announcement.department;

  const employees = await Employee.find(query).select("email");
  return User.find({ email: { $in: employees.map((item) => item.email).filter(Boolean) } }).select("_id");
};

const attachSignedImageUrl = async (announcement) => {
  const item = announcement.toObject ? announcement.toObject() : { ...announcement };
  if (item.imageStorage === "S3" && item.imagePath) {
    item.imageUrl = await getSignedFileUrl({
      filePath: item.imagePath,
      fileUrl: item.imageUrl,
      storage: "S3"
    });
  }
  return item;
};

export const getAnnouncements = async (req, res) => {
  try {
    const { branch, company, department, category, audience } = req.query;

    const filter = { isActive: true };
    if (branch) filter.branch = branch;
    if (company) filter.company = company;
    if (department) filter.department = department;
    if (category) filter.category = category;
    if (audience) filter.audience = audience;

    const announcements = await Announcement.find(filter).sort({ publishedAt: -1 });
    const withUrls = await Promise.all(announcements.map(attachSignedImageUrl));
    res.json(withUrls);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch announcements" });
  }
};

export const createAnnouncement = async (req, res) => {
  try {
    let imageData = {};

    if (req.file) {
      const stored = await storeUploadedFile({
        file: req.file,
        folder: "announcements",
        preferS3: true
      });
      imageData = {
        imagePath: stored.filePath,
        imageUrl: stored.fileUrl,
        imageStorage: stored.storage
      };
    }

    const announcement = await Announcement.create({
      ...req.body,
      ...imageData,
      publishedBy: req.user._id
    });

    const recipients = await resolveAudienceUsers(announcement);
    await Promise.all(recipients.map((recipient) => createNotification({
      recipient: recipient._id,
      title: announcement.title,
      message: announcement.message,
      type: "INFO",
      link: "/app/announcements"
    })));

    const withUrl = await attachSignedImageUrl(announcement);
    res.status(201).json(withUrl);
  } catch (error) {
    res.status(500).json({ message: "Failed to create announcement" });
  }
};

export const deleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete announcement" });
  }
};
