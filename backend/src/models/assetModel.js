import mongoose from "mongoose";

const assetSchema = new mongoose.Schema({
  assetCode: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  subLocation: {
    type: String,
    default: ""
  },
  custodian: {
    type: String,
    required: true
  },
  department: {
    type: String,
    default: ""
  },
  purchaseCost: {
    type: Number,
    required: true
  },
  purchaseDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ["Available", "In Use", "Under Maintenance"],
    default: "Available"
  }
}, { timestamps: true });

export default mongoose.model("Asset", assetSchema);
