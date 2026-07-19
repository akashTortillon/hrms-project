import mongoose from "mongoose";

const leaveWalletSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true
  },
  leaveType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Master",
    required: true
  },
  creditedDays: { type: Number, default: 0 },
  usedDays: { type: Number, default: 0 },
  balanceDays: { type: Number, default: 0 },
  // Custom per-employee allocation override (e.g. 15 CL instead of the master's default 12).
  // When set, the accrual job credits this instead of the Leave Type's daysPerCycle.
  overrideDays: { type: Number, default: null },
  lastCreditDate: { type: Date, default: null },

  // Advance leave (granted before eligibility): deduction is computed and locked at grant
  // time (dailySalary-at-that-moment x days), so a later refund always matches the exact
  // amount that was actually deducted, even if the employee's salary changes in between.
  pendingDeductionDays: { type: Number, default: 0 },
  pendingDeductionAmount: { type: Number, default: 0 },

  // Set when an anniversary/yearly credit clears (fully or partially) a negative
  // advance-leave balance. HR applies this via Payroll's manual adjustment, then clears
  // it via the wallet API. pendingRefundAmount is always <= the original locked deduction.
  pendingRefundDays: { type: Number, default: 0 },
  pendingRefundAmount: { type: Number, default: 0 }
}, { timestamps: true });

leaveWalletSchema.index({ employee: 1, leaveType: 1 }, { unique: true });

export default mongoose.model("LeaveWallet", leaveWalletSchema);
