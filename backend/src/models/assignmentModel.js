import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema({
  assetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Asset",
    required: true
  },
  fromEntityType: {
    type: String,
    enum: ["EMPLOYEE", "STORE", "MAINTENANCE_SHOP"],
    required: true
  },
  toEntityType: {
    type: String,
    enum: ["EMPLOYEE", "STORE", "MAINTENANCE_SHOP"],
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
  },
  actionType: {
    type: String,
    enum: ["ASSIGN", "TRANSFER_TO_EMPLOYEE", "TRANSFER_TO_STORE", "TRANSFER_TO_MAINTENANCE", "RETURN_FROM_MAINTENANCE", "RETURN"],
    default: "ASSIGN"
  },
  shop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Master",
    default: null
  },
  serviceCost: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

export default mongoose.model("Assignment", assignmentSchema);