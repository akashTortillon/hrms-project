import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";

const app = express();

// Middleware
app.use(cors({
  origin: ["http://localhost:5173", "https://your-frontend.vercel.app"], // frontend URL
  credentials: true
}));

app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);

export default app;