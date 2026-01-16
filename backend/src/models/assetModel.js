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
    enum: ["Available", "In Use", "Under Maintenance", "Disposed"],
    default: "Available"
  },
  warrantyPeriod: {
    type: Number,
    default: null
  },
  warrantyExpiryDate: {
    type: Date,
    default: null
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  currentLocation: {
    type: {
      type: String,
      enum: ["EMPLOYEE", "MAINTENANCE_SHOP", "STORE"],
      default: "STORE"
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null
    },
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Master",
      default: null
    }
  }
}, { timestamps: true });

export default mongoose.model("Asset", assetSchema);
