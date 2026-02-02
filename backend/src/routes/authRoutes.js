import express from "express";
import { login, register, refresh, logout, changePassword } from "../controllers/authController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.post("/change-password", protect, changePassword); // Protected

export default router;
