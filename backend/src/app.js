import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import requestRoutes from "./routes/requestRoutes.js";
// Legacy routes removed

const app = express();




app.use(
  cors({
    origin: true, // 🔥 allow all origins (temporary)
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);



// Body parser
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);

// 🔹 Employee APIs
app.use("/api/employees", employeeRoutes);
console.log("✅ Employee routes registered at /api/employees");

// 🔹 Attendance APIs
app.use("/api/attendance", attendanceRoutes);
console.log("✅ Attendance routes registered at /api/attendance");

// 🔹 Request APIs
app.use("/api/requests", requestRoutes);
// 🔹 Unified Master API
import masterRoutes from "./routes/masterRoutes.js";
app.use("/api/masters", masterRoutes);
console.log("✅ Unified Master routes registered at /api/masters");

// 🔹 System Settings API
import systemSettingsRoutes from "./routes/systemSettingsRoutes.js";
app.use("/api/system-settings", systemSettingsRoutes);
console.log("✅ System Settings routes registered at /api/system-settings");



export default app;
