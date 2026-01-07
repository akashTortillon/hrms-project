import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";

const app = express();

// ✅ Allowed frontend origins
// const allowedOrigins = [
//   "http://localhost:5173",
//   "https://hr-and-asset-management-qc7j.vercel.app",
//   "https://hr-and-asset-management-7osm.vercel.app"
// ];

// // ✅ CORS middleware (must be BEFORE routes)
// app.use(
//   cors({
//     origin: function (origin, callback) {
//       // allow requests with no origin (Postman, curl)
//       if (!origin) return callback(null, true);

//       if (allowedOrigins.includes(origin)) {
//         callback(null, true);
//       } else {
//         callback(new Error("Not allowed by CORS"));
//       }
//     },
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization"]
//   })
// );


const allowedOrigins = [
  "http://localhost:5173",
  "https://hr-and-asset-management-qc7j.vercel.app"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      // Allow localhost
      if (origin.startsWith("http://localhost")) {
        return callback(null, true);
      }

      // Allow ALL Vercel preview & production URLs for this app
      if (
        origin.endsWith(".vercel.app") &&
        origin.includes("hr-and-asset-management")
      ) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
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

export default app;
