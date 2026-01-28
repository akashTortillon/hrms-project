import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import payrollRoutes from "./routes/payrollRoutes.js";
import requestRoutes from "./routes/requestRoutes.js";
import assetRoutes from "./routes/assetRoutes.js";

const app = express();




app.use(
  cors({
    origin: true, // allow all origins
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);



// Body parser
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);

// 🔹 Employee APIs
app.use("/api/employees", employeeRoutes);
// console.log(" Employee routes registered at /api/employees");

// 🔹 Attendance APIs
app.use("/api/attendance", attendanceRoutes);
// console.log("Attendance routes registered at /api/attendance");

// 🔹 Request APIs
app.use("/api/requests", requestRoutes);

// 🔹 Payroll APIs
app.use("/api/payroll", payrollRoutes);
// console.log("✅ Payroll routes registered at /api/payroll");
// 🔹 Unified Master API
import masterRoutes from "./routes/masterRoutes.js";
app.use("/api/masters", masterRoutes);
// console.log("Unified Master routes registered at /api/masters");

// 🔹 System Settings API
import systemSettingsRoutes from "./routes/systemSettingsRoutes.js";
app.use("/api/system-settings", systemSettingsRoutes);
// console.log("System Settings routes registered at /api/system-settings");

// 🔹 Company Documents API
import companyDocRoutes from "./routes/companyDocRoutes.js";
app.use("/api/documents", companyDocRoutes);

// 🔹 Employee Documents API (Specific to Employee)
import employeeDocumentRoutes from "./routes/employeeDocumentRoutes.js";
app.use("/api/employee-docs", employeeDocumentRoutes);
// console.log("✅ Employee Document routes registered at /api/employee-docs");

// Serve uploaded files statically
app.use("/uploads", express.static("uploads"));

// 🔹 Asset APIs
app.use("/api/assets", assetRoutes);
// console.log("Asset routes registered at /api/assets");

// 🔹 Report APIs
import reportRoutes from "./routes/reportRoutes.js";
app.use("/api/reports", reportRoutes);
// console.log("✅ Report routes registered at /api/reports");

// 🔹 Training APIs
import trainingRoutes from "./routes/trainingRoutes.js";
app.use("/api/trainings", trainingRoutes);
// console.log("✅ Training routes registered at /api/trainings");

// 🔹 Workflow APIs (Onboarding/Offboarding)
import workflowRoutes from "./routes/workflowRoutes.js";
app.use("/api/workflows", workflowRoutes);

// 🔹 Global Search API
import searchRoutes from "./routes/searchRoutes.js";
app.use("/api/search", searchRoutes);

// 🔹 Notification API
import notificationRoutes from "./routes/notificationRoutes.js";
app.use("/api/notifications", notificationRoutes);

export default app;
