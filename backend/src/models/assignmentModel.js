import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema({
  assetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Asset",
    required: true
  },
  fromEntityType: {
    type: String,
    enum: ["EMPLOYEE", "STORE"],
    required: true
  },
  toEntityType: {
    type: String,
    enum: ["EMPLOYEE", "STORE"],
    required: true
  },
  fromEmployee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    default: null
  },
  toEmployee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    default: null
  },
  fromStore: {
    type: String,
    default: null
  },
  toStore: {
    type: String,
    default: null
  },
  assignedAt: {
    type: Date,
    default: Date.now
  },
  returnedAt: {
    type: Date,
    default: null
  },
  remarks: {
    type: String,
    default: ""
  }
}, { timestamps: true });

export default mongoose.model("Assignment", assignmentSchema);
