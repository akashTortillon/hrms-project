import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import requestRoutes from "./routes/requestRoutes.js";
import assetRoutes from "./routes/assetRoutes.js";

const app = express();




app.use(
  cors({
    origin: true, // allow all origins
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS","PATCH"],
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
console.log("✅ Request routes registered at /api/requests");

// 🔹 Asset APIs
app.use("/api/assets", assetRoutes);
console.log("✅ Asset routes registered at /api/assets");



export default app;
