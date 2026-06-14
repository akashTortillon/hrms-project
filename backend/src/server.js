import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./config/db.js";
import biometricScheduler from "./schedulers/biometricScheduler.js";

dotenv.config();

const PORT = process.env.PORT || 3005;

// DB connection & Start background scheduler
connectDB().then(() => {
  biometricScheduler.start();
});

app.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
});
