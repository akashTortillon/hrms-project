import Announcement from "../models/announcementModel.js";
import Employee from "../models/employeeModel.js";
import User from "../models/userModel.js";
import { createNotification } from "./notificationController.js";

const resolveAudienceUsers = async (announcement) => {
  if (announcement.audience === "EMPLOYEE" && announcement.employeeIds?.length) {
    const employees = await Employee.find({ _id: { $in: announcement.employeeIds } }).select("email");
    return User.find({ email: { $in: employees.map((item) => item.email).filter(Boolean) } }).select("_id");
  }

  const query = {};
  if (announcement.audience === "BRANCH" && announcement.branch) query.branch = announcement.branch;
  if (announcement.audience === "COMPANY" && announcement.company) query.company = announcement.company;

  const employees = await Employee.find(query).select("email");
  return User.find({ email: { $in: employees.map((item) => item.email).filter(Boolean) } }).select("_id");
};

export const getAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find({ isActive: true }).sort({ publishedAt: -1 });
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch announcements" });
  }
};

export const createAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.create({
      ...req.body,
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

    res.status(201).json(announcement);
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
