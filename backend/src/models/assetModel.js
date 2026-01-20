



import mongoose from "mongoose";

// Maintenance Log Sub-Schema
const maintenanceLogSchema = new mongoose.Schema({
  scheduledDate: {
    type: Date,
    required: true
  },
  completedDate: {
    type: Date,
    default: null
  },
  serviceType: {
    type: String,
    required: true
  },
  provider: {
    type: String,
    required: true
  },
  cost: {
    type: Number,
    default: 0
  },
  description: {
    type: String,
    default: ""
  },
  status: {
    type: String,
    enum: ["Scheduled", "In Progress", "Completed", "Cancelled"],
    default: "Scheduled"
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// AMC Details Sub-Schema
const amcDetailsSchema = new mongoose.Schema({
  provider: {
    type: String,
    required: true
  },
  contractNumber: {
    type: String,
    default: ""
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  cost: {
    type: Number,
    default: 0
  },
  coverageDetails: {
    type: String,
    default: ""
  },
  status: {
    type: String,
    enum: ["Active", "Expired", "Cancelled"],
    default: "Active"
  }
});

// Document Sub-Schema
const documentSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["Invoice", "LPO", "Warranty Certificate", "AMC Contract", "Other"],
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  }
});

// Disposal Details Sub-Schema
const disposalDetailsSchema = new mongoose.Schema({
  disposalDate: {
    type: Date,
    required: true
  },
  disposalMethod: {
    type: String,
    enum: ["Sold", "Donated", "Scrapped", "Recycled", "Other"],
    required: true
  },
  disposalReason: {
    type: String,
    required: true
  },
  disposalValue: {
    type: Number,
    default: 0
  },
  disposedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  remarks: {
    type: String,
    default: ""
  },
  disposalDocument: {
    type: String,
    default: ""
  }
});

// Main Asset Schema
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
  serialNumber: {
    type: String,
    default: ""
  },
  type: {
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
  type: {
    type: String,
    enum: ["EMPLOYEE", "DEPARTMENT"],
    default: null
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    default: null
  },
  department: {
    type: String, // or ObjectId if you have Department model
    default: null
  }
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
  serviceDueDate: {
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
  },
  maintenanceLogs: [maintenanceLogSchema],
  amcDetails: amcDetailsSchema,
  documents: [documentSchema],
  disposalDetails: disposalDetailsSchema
}, { timestamps: true });

// Index for efficient queries
assetSchema.index({ assetCode: 1 });
assetSchema.index({ status: 1 });
assetSchema.index({ custodian: 1 });
assetSchema.index({ warrantyExpiryDate: 1 });
assetSchema.index({ serviceDueDate: 1 });

export default mongoose.model("Asset", assetSchema);