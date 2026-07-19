import express from "express";
import multer from "multer";
import { protect, hasPermission } from "../middlewares/authMiddleware.js";
import { createAnnouncement, deleteAnnouncement, getAnnouncements } from "../controllers/announcementController.js";

const router = express.Router();
const memoryUpload = multer({ storage: multer.memoryStorage() });

router.use(protect);

router.get("/", getAnnouncements);
router.post(
  "/",
  hasPermission("MANAGE_ANNOUNCEMENTS"),
  memoryUpload.single("image"),
  createAnnouncement
);
router.delete("/:id", hasPermission("MANAGE_ANNOUNCEMENTS"), deleteAnnouncement);

export default router;
