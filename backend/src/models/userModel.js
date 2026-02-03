
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: {
    type: String,
    required: true,
    unique: true,
    match: [
      /^\+971\d{7,12}$/,
      "Phone number must be a valid UAE number starting with +971"
    ]
  },
  password: { type: String, required: true },
  role: { type: String, default: "Employee" },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: false
  },
  refreshTokens: [
    {
      token: { type: String, required: true },
      family: { type: String, required: true },
      expires: { type: Date, required: true },
      createdAt: { type: Date, default: Date.now }
    }
  ],
  dismissedNotifications: {
    type: [String],
    default: []
  }
},
  { timestamps: true });


export default mongoose.model("User", userSchema);
