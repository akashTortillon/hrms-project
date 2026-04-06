import express from "express";
import { protect, hasPermission } from "../middlewares/authMiddleware.js";
import { createAnnouncement, deleteAnnouncement, getAnnouncements } from "../controllers/announcementController.js";

const router = express.Router();

router.use(protect);

router.get("/", getAnnouncements);
router.post("/", hasPermission("MANAGE_ANNOUNCEMENTS"), createAnnouncement);
router.delete("/:id", hasPermission("MANAGE_ANNOUNCEMENTS"), deleteAnnouncement);

export default router;
