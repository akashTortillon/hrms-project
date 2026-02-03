import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true
    },

    date: {
      type: String, // YYYY-MM-DD
      required: true
    },

    shift: {
      type: String,
      default: "Day Shift"
    },

    checkIn: {
      type: String, // "08:45"
      default: null
    },

    checkOut: {
      type: String, // "17:30"
      default: null
    },

    workHours: {
      type: String, // "8h 45m"
      default: null
    },

    status: {
      type: String,
      enum: ["Present", "Late", "Absent", "On Leave"],
      default: "Absent"
    },

    lateTier: {
      type: Number,
      default: 0 // 0=None/OnTime, 1=Tier1, 2=Tier2, 3=Tier3(Max)
    },

    leaveType: {
      type: String,
      default: null
    },

    isPaid: {
      type: Boolean,
      default: true
    },

    // ✅ Manual Edit Tracking
    isManuallyEdited: {
      type: Boolean,
      default: false
    },
    editedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    editedAt: {
      type: Date,
      default: null
    },
    editReason: {
      type: String, // Reason is mandatory for manual edits
      default: ""
    }
  },
  {
    timestamps: true
  }
);

// 🔒 One attendance per employee per day
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

export default mongoose.model("Attendance", attendanceSchema);
