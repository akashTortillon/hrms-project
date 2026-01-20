// import Assignment from "../models/assignmentModel.js";
// import Asset from "../models/assetModel.js";
// import Employee from "../models/employeeModel.js";

// // Asset lifecycle validation helpers
// const VALID_TRANSITIONS = {
//   "Available": ["ASSIGN"], // Available can only be assigned
//   "In Use": ["TRANSFER_TO_MAINTENANCE", "RETURN"], // In Use can go to maintenance or be returned
//   "Under Maintenance": ["RETURN_FROM_MAINTENANCE"] // Under Maintenance can only return
// };

// const validateTransition = (currentStatus, actionType) => {
//   const validActions = VALID_TRANSITIONS[currentStatus];
//   if (!validActions) {
//     return { valid: false, message: `Invalid current status: ${currentStatus}` };
//   }
  
//   if (!validActions.includes(actionType)) {
//     return { 
//       valid: false, 
//       message: `Cannot ${actionType.replace(/_/g, ' ').toLowerCase()} asset with status: ${currentStatus}` 
//     };
//   }
  
//   return { valid: true };
// };

// const getNextStatus = (actionType) => {
//   const statusMap = {
//     "ASSIGN": "In Use",
//     "TRANSFER_TO_MAINTENANCE": "Under Maintenance",
//     "RETURN_FROM_MAINTENANCE": "In Use",
//     "RETURN": "Available"
//   };
//   return statusMap[actionType] || null;
// };

// // Assign asset to employee
// export const assignAssetToEmployee = async (req, res) => {
//   try {
//     const { assetId, toEmployee, remarks } = req.body;

//     // Validation
//     if (!assetId || !toEmployee) {
//       return res.status(400).json({ message: "Asset ID and Employee ID are required" });
//     }

//     // Check if asset exists
//     const asset = await Asset.findById(assetId);
//     if (!asset) {
//       return res.status(404).json({ message: "Asset not found" });
//     }

//     // Check if asset is soft deleted
//     if (asset.isDeleted) {
//       return res.status(400).json({ message: "Cannot assign deleted asset" });
//     }

//     // Validate lifecycle transition
//     const transitionValidation = validateTransition(asset.status, "ASSIGN");
//     if (!transitionValidation.valid) {
//       return res.status(400).json({ message: transitionValidation.message });
//     }

//     // Check if employee exists
//     const employee = await Employee.findById(toEmployee);
//     if (!employee) {
//       return res.status(404).json({ message: "Employee not found" });
//     }

//     // Create assignment record
//     const assignment = await Assignment.create({
//       assetId,
//       fromEntityType: "STORE",
//       toEntityType: "EMPLOYEE",
//       fromStore: asset.location,
//       toEmployee,
//       assignedAt: new Date(),
//       remarks: remarks || "",
//       actionType: "ASSIGN"
//     });

//     // Update asset status and currentLocation
//     const newStatus = getNextStatus("ASSIGN");
//     await Asset.findByIdAndUpdate(assetId, { 
//       status: newStatus,
//       currentLocation: {
//         type: "EMPLOYEE",
//         employee: toEmployee,
//         shop: null
//       }
//     });

//     res.status(201).json({
//       message: "Asset assigned successfully",
//       assignment,
//       newStatus
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// // Transfer asset
// export const transferAsset = async (req, res) => {
//   try {
//     const { assetId, toEntityType, toEmployee, toStore, remarks, actionType, shop } = req.body;

//     // Validation
//     if (!assetId || !toEntityType || !actionType) {
//       return res.status(400).json({ message: "Asset ID, transfer target, and action type are required" });
//     }

//     if (toEntityType === "EMPLOYEE" && !toEmployee) {
//       return res.status(400).json({ message: "Employee ID is required for employee transfer" });
//     }

//     if ((toEntityType === "STORE" || toEntityType === "MAINTENANCE_SHOP") && !toStore && !shop) {
//       return res.status(400).json({ message: "Shop/Store reference is required for store/maintenance transfer" });
//     }

//     // Check if asset exists
//     const asset = await Asset.findById(assetId);
//     if (!asset) {
//       return res.status(404).json({ message: "Asset not found" });
//     }

//     // Check if asset is soft deleted
//     if (asset.isDeleted) {
//       return res.status(400).json({ message: "Cannot transfer deleted asset" });
//     }

//     // Validate lifecycle transition
//     const transitionValidation = validateTransition(asset.status, actionType);
//     if (!transitionValidation.valid) {
//       return res.status(400).json({ message: transitionValidation.message });
//     }

//     // Get current assignment
//     const currentAssignment = await Assignment.findOne({
//       assetId,
//       returnedAt: null
//     }).sort({ assignedAt: -1 });

//     let fromEntityType = "STORE";
//     let fromEmployee = null;
//     let fromStore = asset.location;

//     if (currentAssignment) {
//       fromEntityType = currentAssignment.toEntityType;
//       fromEmployee = currentAssignment.toEmployee;
//       fromStore = currentAssignment.toStore;
//     }

//     // If transferring to employee, check if employee exists
//     if (toEntityType === "EMPLOYEE") {
//       const employee = await Employee.findById(toEmployee);
//       if (!employee) {
//         return res.status(404).json({ message: "Employee not found" });
//       }
//     }

//     // Determine currentLocation update
//     let locationUpdate = {};
//     if (toEntityType === "EMPLOYEE") {
//       locationUpdate = {
//         type: "EMPLOYEE",
//         employee: toEmployee,
//         shop: null
//       };
//     } else if (toEntityType === "MAINTENANCE_SHOP") {
//       locationUpdate = {
//         type: "MAINTENANCE_SHOP",
//         employee: null,
//         shop: shop || toStore
//       };
//     } else {
//       locationUpdate = {
//         type: "STORE",
//         employee: null,
//         shop: shop || toStore
//       };
//     }

//     // Create new assignment record
//     const assignment = await Assignment.create({
//       assetId,
//       fromEntityType,
//       toEntityType,
//       fromEmployee,
//       fromStore,
//       toEmployee: toEntityType === "EMPLOYEE" ? toEmployee : null,
//       toStore: toEntityType !== "EMPLOYEE" ? (shop || toStore) : null,
//       assignedAt: new Date(),
//       remarks: remarks || "",
//       actionType,
//       shop: shop || null
//     });

//     // Update asset status and currentLocation
//     const newStatus = getNextStatus(actionType);
    
//     await Asset.findByIdAndUpdate(assetId, { 
//       status: newStatus,
//       currentLocation: locationUpdate
//     });

//     res.status(201).json({
//       message: "Asset transferred successfully",
//       assignment,
//       newStatus
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Server error" });
//   }
// };


// // Return asset to store
// export const returnAssetToStore = async (req, res) => {
//   try {
//     const { assetId, remarks, actionType = "RETURN",toEmployee } = req.body;

//     // Validation
//     if (!assetId) {
//       return res.status(400).json({ message: "Asset ID is required" });
//     }

//     // Check if asset exists
//     const asset = await Asset.findById(assetId);
//     if (!asset) {
//       return res.status(404).json({ message: "Asset not found" });
//     }

//     // Check if asset is soft deleted
//     if (asset.isDeleted) {
//       return res.status(400).json({ message: "Cannot return deleted asset" });
//     }

//     if (actionType === "RETURN_FROM_MAINTENANCE" && toEmployee) {
//       return transferAsset(req, res);
//     }

//     // Validate lifecycle transition
//     const transitionValidation = validateTransition(asset.status, actionType);
//     if (!transitionValidation.valid) {
//       return res.status(400).json({ message: transitionValidation.message });
//     }

//     // Get current assignment
//     const currentAssignment = await Assignment.findOne({
//       assetId,
//       returnedAt: null
//     }).sort({ assignedAt: -1 });

//     if (!currentAssignment) {
//       return res.status(400).json({ message: "No active assignment found" });
//     }

//     // Update assignment with return date and action type
//     currentAssignment.returnedAt = new Date();
//     currentAssignment.actionType = actionType;
//     if (remarks) {
//       currentAssignment.remarks = currentAssignment.remarks 
//         ? `${currentAssignment.remarks}\nReturn: ${remarks}` 
//         : `Return: ${remarks}`;
//     }
//     await currentAssignment.save();

//     // Update asset status and currentLocation
//     const newStatus = getNextStatus(actionType);
//     await Asset.findByIdAndUpdate(assetId, { 
//       status: newStatus,
//       currentLocation: {
//         type: "STORE",
//         employee: null,
//         shop: null
//       }
//     });

//     res.json({
//       message: "Asset returned successfully",
//       assignment: currentAssignment,
//       newStatus
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// // Get asset history
// export const getAssetHistory = async (req, res) => {
//   try {
//     const { id } = req.params;

//     // Check if asset exists
//     const asset = await Asset.findById(id);
//     if (!asset) {
//       return res.status(404).json({ message: "Asset not found" });
//     }

//     // Get all assignments for this asset, populated with references
//     const assignments = await Assignment.find({ assetId: id })
//       .populate('fromEmployee', 'name email')
//       .populate('toEmployee', 'name email')
//       .populate('shop', 'name code')
//       .sort({ assignedAt: -1 });

    
//     // Format history entries
//     const history = assignments.map(assignment => {
//       let fromLocation;
      
//       // Special handling for RETURN_FROM_MAINTENANCE
//       if (assignment.fromEntityType === 'MAINTENANCE_SHOP') {
//   fromLocation = assignment.shop?.name || 'Unknown Shop';
// }
//        else if (assignment.fromEntityType === 'EMPLOYEE') {
//         // Check if fromEmployee is populated (has .name property)
//         if (assignment.fromEmployee?.name) {
//           fromLocation = assignment.fromEmployee.name;
//         } else if (typeof assignment.fromEmployee === 'string') {
//           // It's an unpopulated ObjectId, use shop as fallback
//           fromLocation = assignment.shop?.name || assignment.fromEmployee;
//         } else {
//           fromLocation = 'Unknown Employee';
//         }
//       } else if (assignment.fromEntityType === 'MAINTENANCE_SHOP') {
//         fromLocation = assignment.shop?.name || assignment.fromStore || 'Unknown Shop';
//       } else {
//         fromLocation = assignment.fromStore || 'Store';
//       }

//       // ✅ ENHANCED: Defensive TO location handling
//       let toLocation;
      
//       if (assignment.toEntityType === 'EMPLOYEE') {
//         if (assignment.toEmployee?.name) {
//           toLocation = assignment.toEmployee.name;
//         } else if (typeof assignment.toEmployee === 'string') {
//           toLocation = assignment.toEmployee;
//         } else {
//           toLocation = 'Unknown Employee';
//         }
//       } else if (assignment.toEntityType === 'MAINTENANCE_SHOP') {
//         toLocation = assignment.shop?.name || assignment.toStore || 'Unknown Shop';
//       } else {
//         toLocation = assignment.toStore || 'Store';
//       }


//       return {
//         id: assignment._id,
//         actionType: assignment.actionType,
//         from: {
//           type: assignment.fromEntityType,
//           name: fromLocation,
//           employee: assignment.fromEmployee,
//           store: assignment.fromStore
//         },
//         to: {
//           type: assignment.toEntityType,
//           name: toLocation,
//           employee: assignment.toEmployee,
//           store: assignment.toStore,
//           shop: assignment.shop
//         },
//         statusAfterAction: getNextStatus(assignment.actionType),
//         date: assignment.assignedAt,
//         returnedAt: assignment.returnedAt,
//         remarks: assignment.remarks,
//         isActive: !assignment.returnedAt
//       };
//     });

//     res.json({
//       asset: {
//         id: asset._id,
//         name: asset.name,
//         assetCode: asset.assetCode,
//         currentStatus: asset.status,
//         currentLocation: asset.currentLocation
//       },
//       history,
//       totalRecords: history.length
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// // Get current assignment for an asset
// export const getCurrentAssignment = async (req, res) => {
//   try {
//     const { id } = req.params;

//     // Find the active assignment for the asset
//     const assignment = await Assignment.findOne({
//       assetId: id,
//       returnedAt: null
//     })
//     .populate('toEmployee', 'name code')
//     .populate('shop', 'name code')
//     .populate('toStore', 'name')
//     .sort({ assignedAt: -1 });

//     if (!assignment) {
//       return res.json(null);
//     }

//     // Return the current assignment data
//     const currentAssignment = {
//       _id: assignment._id,
//       assetId: assignment.assetId,
//       toEntityType: assignment.toEntityType,
//       toEmployee: assignment.toEmployee,
//       toStore: assignment.toStore,
//       shop: assignment.shop,
//       assignedAt: assignment.assignedAt,
//       actionType: assignment.actionType
//     };

//     res.json(currentAssignment);
//   } catch (error) {
//     console.error("Get current assignment error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };




import Assignment from "../models/assignmentModel.js";
import Asset from "../models/assetModel.js";
import Employee from "../models/employeeModel.js";
import mongoose from "mongoose";
// Asset lifecycle validation helpers
// const VALID_TRANSITIONS = {
//   "Available": ["ASSIGN"],
//   "In Use": ["TRANSFER_TO_MAINTENANCE", "RETURN"],
//   "Under Maintenance": ["RETURN_FROM_MAINTENANCE"]
// };


const VALID_TRANSITIONS = {
  "Available": [
    "ASSIGN"
  ],

  "In Use": [
    "TRANSFER_TO_EMPLOYEE",
    "TRANSFER_TO_MAINTENANCE",
    "TRANSFER_TO_STORE"
  ],

  "Under Maintenance": [
    "RETURN_FROM_MAINTENANCE"
  ]
};

const validateTransition = (currentStatus, actionType) => {
  const validActions = VALID_TRANSITIONS[currentStatus];
  if (!validActions) {
    return { valid: false, message: `Invalid current status: ${currentStatus}` };
  }
  
  if (!validActions.includes(actionType)) {
    return { 
      valid: false, 
      message: `Cannot ${actionType.replace(/_/g, ' ').toLowerCase()} asset with status: ${currentStatus}` 
    };
  }
  
  return { valid: true };
};

const getNextStatus = (actionType) => {
  // const statusMap = {
  //   "ASSIGN": "In Use",
  //   "TRANSFER_TO_MAINTENANCE": "Under Maintenance",
  //   "RETURN_FROM_MAINTENANCE": "In Use",
  //   "RETURN": "Available"
  // };

  const statusMap = {
  ASSIGN: "In Use",

  TRANSFER_TO_EMPLOYEE: "In Use",

  TRANSFER_TO_MAINTENANCE: "Under Maintenance",

  TRANSFER_TO_STORE: "Available",

  RETURN_FROM_MAINTENANCE: "In Use",

  RETURN: "Available"
};

  return statusMap[actionType] || null;
};

// Assign asset to employee
export const assignAssetToEmployee = async (req, res) => {
  try {
    const { assetId, toEmployee, remarks } = req.body;

    if (!assetId || !toEmployee) {
      return res.status(400).json({ message: "Asset ID and Employee ID are required" });
    }

    const asset = await Asset.findById(assetId);
    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }

    if (asset.isDeleted) {
      return res.status(400).json({ message: "Cannot assign deleted asset" });
    }

    const transitionValidation = validateTransition(asset.status, "ASSIGN");
    if (!transitionValidation.valid) {
      return res.status(400).json({ message: transitionValidation.message });
    }

    const employee = await Employee.findById(toEmployee);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const assignment = await Assignment.create({
      assetId,
      fromEntityType: "STORE",
      toEntityType: "EMPLOYEE",
      fromStore: asset.location,
      toEmployee,
      assignedAt: new Date(),
      remarks: remarks || "",
      actionType: "ASSIGN"
    });

    const newStatus = getNextStatus("ASSIGN");
    
    // ✅ UPDATED: Also update custodian field when assigning
    await Asset.findByIdAndUpdate(assetId, { 
      status: newStatus,
      custodian: toEmployee,
      currentLocation: {
        type: "EMPLOYEE",
        employee: toEmployee,
        shop: null
      }
    });

    res.status(201).json({
      message: "Asset assigned successfully",
      assignment,
      newStatus
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};




// // Transfer asset
// export const transferAsset = async (req, res) => {
//   try {
//     const { assetId, toEntityType, toEmployee, toStore, remarks, actionType, shop } = req.body;

//     if (!assetId || !toEntityType || !actionType) {
//       return res.status(400).json({ message: "Asset ID, transfer target, and action type are required" });
//     }

//     if (toEntityType === "EMPLOYEE" && !toEmployee) {
//       return res.status(400).json({ message: "Employee ID is required for employee transfer" });
//     }

//     if ((toEntityType === "STORE" || toEntityType === "MAINTENANCE_SHOP") && !toStore && !shop) {
//       return res.status(400).json({ message: "Shop/Store reference is required for store/maintenance transfer" });
//     }

//     const asset = await Asset.findById(assetId);
//     if (!asset) {
//       return res.status(404).json({ message: "Asset not found" });
//     }

//     if (asset.isDeleted) {
//       return res.status(400).json({ message: "Cannot transfer deleted asset" });
//     }

//     const transitionValidation = validateTransition(asset.status, actionType);
//     if (!transitionValidation.valid) {
//       return res.status(400).json({ message: transitionValidation.message });
//     }


//     // ✅ Rule A: Only ONE active maintenance at a time
// if (actionType === "TRANSFER_TO_MAINTENANCE") {
//   const activeMaintenance = await Assignment.findOne({
//     assetId,
//     actionType: "TRANSFER_TO_MAINTENANCE",
//     returnedAt: null,
//   });

//   if (activeMaintenance) {
//     return res.status(400).json({
//       message: "Asset already has an active maintenance. Complete it before assigning again.",
//     });
//   }
// }

//     const currentAssignment = await Assignment.findOne({
//       assetId,
//       returnedAt: null
//     }).sort({ assignedAt: -1 });

//     let fromEntityType = "STORE";
//     let fromEmployee = null;
//     let fromStore = asset.location;

//     if (currentAssignment) {
//       fromEntityType = currentAssignment.toEntityType;
//       fromEmployee = currentAssignment.toEmployee;
//       fromStore = currentAssignment.toStore;
//     }

//     if (toEntityType === "EMPLOYEE") {
//       const employee = await Employee.findById(toEmployee);
//       if (!employee) {
//         return res.status(404).json({ message: "Employee not found" });
//       }
//     }

//     let locationUpdate = {};
//     let custodianUpdate = null;

//     if (toEntityType === "EMPLOYEE") {
//       locationUpdate = {
//         type: "EMPLOYEE",
//         employee: toEmployee,
//         shop: null
//       };
//       custodianUpdate = toEmployee; // ✅ Update custodian for employee transfer
//     } else if (toEntityType === "MAINTENANCE_SHOP") {
//       locationUpdate = {
//         type: "MAINTENANCE_SHOP",
//         employee: null,
//         shop: shop || toStore
//       };
//       custodianUpdate = null;
//     } else {
//       locationUpdate = {
//         type: "STORE",
//         employee: null,
//         shop: shop || toStore
//       };
//       custodianUpdate = null;
//     }

//     const assignment = await Assignment.create({
//       assetId,
//       fromEntityType,
//       toEntityType,
//       fromEmployee,
//       fromStore,
//       toEmployee: toEntityType === "EMPLOYEE" ? toEmployee : null,
//       toStore: toEntityType !== "EMPLOYEE" ? (shop || toStore) : null,
//       assignedAt: new Date(),
//       remarks: remarks || "",
//       actionType,
//       shop: shop || null
//     });

//     const newStatus = getNextStatus(actionType);
    
//     // ✅ UPDATED: Update custodian along with status and location
//     await Asset.findByIdAndUpdate(assetId, { 
//       status: newStatus,
//       custodian: custodianUpdate,
//       currentLocation: locationUpdate
//     });

//     res.status(201).json({
//       message: "Asset transferred successfully",
//       assignment,
//       newStatus
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Server error" });
//   }
// };






// Transfer asset
// Transfer asset
// export const transferAsset = async (req, res) => {
//   try {
//     const {
//       assetId,
//       toEntityType,
//       toEmployee,
//       toStore,
//       remarks,
//       actionType,
//       shop
//     } = req.body;

//     console.log("Incoming transfer request:", req.body);

//     /* -------------------- BASIC VALIDATIONS -------------------- */
//     if (!assetId || !toEntityType || !actionType) {
//       return res.status(400).json({
//         message: "Asset ID, transfer target, and action type are required"
//       });
//     }

//     if (toEntityType === "EMPLOYEE" && !toEmployee) {
//       return res.status(400).json({ message: "Employee ID is required for employee transfer" });
//     }

//     if ((toEntityType === "STORE" || toEntityType === "MAINTENANCE_SHOP") && !toStore && !shop) {
//       return res.status(400).json({ message: "Shop/Store reference is required for store/maintenance transfer" });
//     }

//     /* -------------------- FETCH ASSET -------------------- */
//     const asset = await Asset.findById(assetId);
//     if (!asset) return res.status(404).json({ message: "Asset not found" });
//     if (asset.isDeleted) return res.status(400).json({ message: "Cannot transfer deleted asset" });

//     /* -------------------- CURRENT ASSIGNMENT -------------------- */
//     const currentAssignment = await Assignment.findOne({ assetId, returnedAt: null }).sort({ assignedAt: -1 });
//     console.log("Current assignment:", currentAssignment);

//     /* -------------------- RULE B: BLOCK TRANSFER IF ACTIVE MAINTENANCE -------------------- */
//     if (currentAssignment &&
//         currentAssignment.toEntityType === "MAINTENANCE_SHOP" &&
//         currentAssignment.returnedAt === null &&
//         actionType !== "RETURN_FROM_MAINTENANCE") {
//       return res.status(400).json({
//         message: "Asset is currently under active maintenance. Complete it before transferring."
//       });
//     }

//     /* -------------------- RULE A: ONLY ONE ACTIVE MAINTENANCE -------------------- */
//     if (actionType === "TRANSFER_TO_MAINTENANCE") {
//       const activeMaintenance = await Assignment.findOne({
//         assetId,
//         actionType: "TRANSFER_TO_MAINTENANCE",
//         returnedAt: null
//       });

//       if (activeMaintenance) return res.status(400).json({
//         message: "Asset already has an active maintenance. Complete it before assigning again."
//       });
//     }

//     /* -------------------- SOURCE INFO -------------------- */
//     let fromEntityType = "STORE", fromEmployee = null, fromStore = asset.location;
//     if (currentAssignment) {
//       fromEntityType = currentAssignment.toEntityType;
//       fromEmployee = currentAssignment.toEmployee;
//       fromStore = currentAssignment.toStore;
//     }

//     /* -------------------- TARGET VALIDATION -------------------- */
//     if (toEntityType === "EMPLOYEE") {
//       const employee = await Employee.findById(toEmployee);
//       if (!employee) return res.status(404).json({ message: "Employee not found" });
//     }

//     /* -------------------- LOCATION + CUSTODIAN LOGIC -------------------- */
//     let locationUpdate = {}, custodianUpdate = null;
//     if (toEntityType === "EMPLOYEE") {
//       locationUpdate = { type: "EMPLOYEE", employee: toEmployee, shop: null };
//       custodianUpdate = { type: "EMPLOYEE", employee: toEmployee, department: null };
//     } else if (toEntityType === "MAINTENANCE_SHOP") {
//       locationUpdate = { type: "MAINTENANCE_SHOP", employee: null, shop: shop || toStore };
//       custodianUpdate = null;
//     } else if (toEntityType === "STORE") {
//       locationUpdate = { type: "STORE", employee: null, shop: shop || toStore };
//       custodianUpdate = { type: "DEPARTMENT", employee: null, department: shop || toStore };
//     }

//     /* -------------------- CREATE ASSIGNMENT HISTORY -------------------- */
//     const assignment = await Assignment.create({
//       assetId,
//       fromEntityType,
//       toEntityType,
//       fromEmployee,
//       fromStore,
//       toEmployee: toEntityType === "EMPLOYEE" ? toEmployee : null,
//       toStore: toEntityType !== "EMPLOYEE" ? (shop || toStore) : null,
//       assignedAt: new Date(),
//       remarks: remarks || "",
//       actionType,
//       shop: shop || null
//     });

//     /* -------------------- UPDATE ASSET -------------------- */
//     const newStatus = getNextStatus(actionType);
//     await Asset.findByIdAndUpdate(assetId, {
//       status: newStatus,
//       custodian: custodianUpdate,
//       currentLocation: locationUpdate
//     });

//     res.status(201).json({ message: "Asset transferred successfully", assignment, newStatus });

//   } catch (error) {
//     console.error("Transfer asset error:", error);
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };













// export const transferAsset = async (req, res) => {
//   try {
//     const {
//       assetId,
//       toEntityType,
//       toEmployee,
//       toStore,
//       remarks,
//       actionType,
//       shop
//     } = req.body;

//     console.log("Incoming transfer request:", req.body);

//     /* -------------------- BASIC VALIDATIONS -------------------- */
//     if (!assetId || !toEntityType || !actionType) {
//       return res.status(400).json({
//         message: "Asset ID, transfer target, and action type are required"
//       });
//     }

//     if (toEntityType === "EMPLOYEE" && !toEmployee) {
//       return res.status(400).json({ message: "Employee ID is required for employee transfer" });
//     }

//     if ((toEntityType === "STORE" || toEntityType === "MAINTENANCE_SHOP") && !shop && !toStore) {
//       return res.status(400).json({ message: "Shop/Store reference is required for store/maintenance transfer" });
//     }

//     /* -------------------- FETCH ASSET -------------------- */
//     const asset = await Asset.findById(assetId);
//     if (!asset) return res.status(404).json({ message: "Asset not found" });
//     if (asset.isDeleted) return res.status(400).json({ message: "Cannot transfer deleted asset" });

//     /* -------------------- CLOSE COMPLETED MAINTENANCE -------------------- */
//     if (actionType !== "TRANSFER_TO_MAINTENANCE" && actionType !== "RETURN_FROM_MAINTENANCE") {
//       await Assignment.updateMany(
//         { assetId, actionType: "TRANSFER_TO_MAINTENANCE", returnedAt: null },
//         { returnedAt: new Date() }
//       );
//     }

//     /* -------------------- FETCH CURRENT ASSIGNMENT -------------------- */
//     const currentAssignment = await Assignment.findOne({
//       assetId,
//       returnedAt: null
//     }).sort({ assignedAt: -1 });

//     console.log("Current assignment:", currentAssignment);

//     /* -------------------- RULE B: BLOCK TRANSFER IF ACTIVE MAINTENANCE -------------------- */
//     // if (
//     //   currentAssignment &&
//     //   currentAssignment.actionType === "TRANSFER_TO_MAINTENANCE" &&
//     //   currentAssignment.returnedAt === null &&
//     //   actionType !== "RETURN_FROM_MAINTENANCE"
//     // ) {
//     //   return res.status(400).json({
//     //     message: "Asset is currently under active maintenance. Complete it before transferring."
//     //   });
//     // }


//     /* -------------------- RULE B: BLOCK INVALID TRANSFERS -------------------- */
//     // Allow transfers from EMPLOYEE to MAINTENANCE (this is a valid workflow)
//     // Only block if trying to transfer from MAINTENANCE to somewhere else without proper return
//     if (
//       currentAssignment &&
//       currentAssignment.actionType === "TRANSFER_TO_MAINTENANCE" &&
//       currentAssignment.returnedAt === null &&
//       actionType !== "RETURN_FROM_MAINTENANCE"
//     ) {
//       return res.status(400).json({
//         message: "Asset is currently under active maintenance. Complete it before transferring."
//       });
//     }
//     /* -------------------- RULE A: ONLY ONE ACTIVE MAINTENANCE -------------------- */
//     if (actionType === "TRANSFER_TO_MAINTENANCE") {
//       const activeMaintenance = await Assignment.findOne({
//         assetId,
//         actionType: "TRANSFER_TO_MAINTENANCE",
//         returnedAt: null
//       });

//       if (activeMaintenance) return res.status(400).json({
//         message: "Asset already has an active maintenance. Complete it before assigning again."
//       });
//     }

//     /* -------------------- SOURCE INFO -------------------- */
//     let fromEntityType = "STORE", fromEmployee = null, fromStore = asset.location;
//     if (currentAssignment) {
//       fromEntityType = currentAssignment.toEntityType;
//       fromEmployee = currentAssignment.toEmployee;
//       fromStore = currentAssignment.toStore;
//     }

//     /* -------------------- TARGET VALIDATION -------------------- */
//     if (toEntityType === "EMPLOYEE") {
//       const employee = await Employee.findById(toEmployee);
//       if (!employee) return res.status(404).json({ message: "Employee not found" });
//     }

//     /* -------------------- LOCATION + CUSTODIAN LOGIC -------------------- */
//     let locationUpdate = {}, custodianUpdate = null;
//     if (toEntityType === "EMPLOYEE") {
//       locationUpdate = { type: "EMPLOYEE", employee: toEmployee, shop: null };
//       custodianUpdate = { type: "EMPLOYEE", employee: toEmployee, department: null };
//     } else if (toEntityType === "MAINTENANCE_SHOP") {
//       locationUpdate = { type: "MAINTENANCE_SHOP", employee: null, shop: shop || toStore };
//       custodianUpdate = null;
//     } else if (toEntityType === "STORE") {
//       locationUpdate = { type: "STORE", employee: null, shop: shop || toStore };
//       custodianUpdate = { type: "DEPARTMENT", employee: null, department: shop || toStore };
//     }

//     /* -------------------- CREATE ASSIGNMENT HISTORY -------------------- */
//     console.log("Creating assignment with:", {
//       assetId,
//       fromEntityType,
//       toEntityType,
//       fromEmployee,
//       fromStore,
//       toEmployee: toEntityType === "EMPLOYEE" ? toEmployee : null,
//       toStore: toEntityType !== "EMPLOYEE" ? (shop || toStore) : null,
//       actionType
//     });

//     const assignment = await Assignment.create({
//       assetId,
//       fromEntityType,
//       toEntityType,
//       fromEmployee,
//       fromStore,
//       toEmployee: toEntityType === "EMPLOYEE" ? toEmployee : null,
//       toStore: toEntityType !== "EMPLOYEE" ? (shop || toStore) : null,
//       assignedAt: new Date(),
//       remarks: remarks || "",
//       actionType,
//       shop: shop || null
//     });

//     /* -------------------- UPDATE ASSET -------------------- */
//     const newStatus = getNextStatus(actionType);
//     await Asset.findByIdAndUpdate(assetId, {
//       status: newStatus,
//       custodian: custodianUpdate,
//       currentLocation: locationUpdate
//     });

//     res.status(201).json({ message: "Asset transferred successfully", assignment, newStatus });

//   } catch (error) {
//     console.error("Transfer asset error:", error);
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };







// export const transferAsset = async (req, res) => {
//   try {
//     const {
//       assetId,
//       toEntityType,
//       toEmployee,
//       toStore,
//       remarks,
//       actionType,
//       shop
//     } = req.body;

//     console.log("Incoming transfer request:", req.body);

//     /* -------------------- BASIC VALIDATIONS -------------------- */
//     if (!assetId || !toEntityType || !actionType) {
//       return res.status(400).json({
//         message: "Asset ID, transfer target, and action type are required"
//       });
//     }

//     if (toEntityType === "EMPLOYEE" && !toEmployee) {
//       return res.status(400).json({
//         message: "Employee ID is required for employee transfer"
//       });
//     }

//     if (
//       (toEntityType === "STORE" || toEntityType === "MAINTENANCE_SHOP") &&
//       !shop &&
//       !toStore
//     ) {
//       return res.status(400).json({
//         message: "Shop/Store reference is required for store/maintenance transfer"
//       });
//     }

//     /* -------------------- FETCH ASSET -------------------- */
//     const asset = await Asset.findById(assetId);
//     if (!asset) return res.status(404).json({ message: "Asset not found" });
//     if (asset.isDeleted)
//       return res.status(400).json({ message: "Cannot transfer deleted asset" });

//     /* -------------------- FETCH CURRENT ASSIGNMENT -------------------- */
//     const currentAssignment = await Assignment.findOne({
//       assetId,
//       returnedAt: null
//     }).sort({ assignedAt: -1 });

//     console.log("Current assignment:", currentAssignment);

//     /* -------------------- RULE A: ONLY ONE ACTIVE MAINTENANCE -------------------- */
//     const isCurrentlyInMaintenance =
//       currentAssignment?.toEntityType === "MAINTENANCE_SHOP";

//     const isTargetMaintenance =
//       toEntityType === "MAINTENANCE_SHOP" &&
//       actionType === "TRANSFER_TO_MAINTENANCE";

//     // ❌ Block ONLY Maintenance → Maintenance
//     if (isCurrentlyInMaintenance && isTargetMaintenance) {
//       return res.status(400).json({
//         message:
//           "Asset is already under active maintenance. Complete or return it before sending again."
//       });
//     }

//     /* -------------------- CLOSE PREVIOUS ASSIGNMENT -------------------- */
//     if (currentAssignment) {
//       currentAssignment.returnedAt = new Date();
//       await currentAssignment.save();
//     }

//     /* -------------------- SOURCE INFO -------------------- */
//     // let fromEntityType = "STORE",
//     //   fromEmployee = null,
//     //   fromStore = asset.currentLocation?.shop || asset.location || null;
    
//     let fromEntityType = "STORE",
//     fromEmployee = null,
//     fromStore =
//       asset.currentLocation?.shop ||
//       asset.location ||
//       currentAssignment?.toStore ||
//       null;





//     if (currentAssignment) {
//       fromEntityType = currentAssignment.toEntityType;
//       fromEmployee = currentAssignment.toEmployee;
//       fromStore = currentAssignment.toStore;
//     }

//     /* -------------------- TARGET VALIDATION -------------------- */
//     if (toEntityType === "EMPLOYEE") {
//       const employee = await Employee.findById(toEmployee);
//       if (!employee)
//         return res.status(404).json({ message: "Employee not found" });
//     }

//     /* -------------------- LOCATION + CUSTODIAN LOGIC -------------------- */
//     let locationUpdate = {},
//       custodianUpdate = null;

//     if (toEntityType === "EMPLOYEE") {
//       locationUpdate = {
//         type: "EMPLOYEE",
//         employee: toEmployee,
//         shop: null
//       };
//       custodianUpdate = {
//         type: "EMPLOYEE",
//         employee: toEmployee,
//         department: null
//       };
//     } else if (toEntityType === "MAINTENANCE_SHOP") {
//       locationUpdate = {
//         type: "MAINTENANCE_SHOP",
//         employee: null,
//         shop: shop || toStore
//       };
//       custodianUpdate = null;
//     } else if (toEntityType === "STORE") {
//       locationUpdate = {
//         type: "STORE",
//         employee: null,
//         shop: shop || toStore
//       };
//       custodianUpdate = {
//         type: "DEPARTMENT",
//         employee: null,
//         department: shop || toStore
//       };
//     }

//     /* -------------------- CREATE ASSIGNMENT HISTORY -------------------- */
//     console.log("Creating assignment with:", {
//       assetId,
//       fromEntityType,
//       toEntityType,
//       fromEmployee,
//       fromStore,
//       toEmployee: toEntityType === "EMPLOYEE" ? toEmployee : null,
//       toStore: toEntityType !== "EMPLOYEE" ? shop || toStore : null,
//       actionType
//     });

//     try {
//       const assignment = await Assignment.create({
//         assetId,
//         fromEntityType,
//         toEntityType,
//         fromEmployee,
//         fromStore,
//         toEmployee: toEntityType === "EMPLOYEE" ? toEmployee : null,
//         toStore: toEntityType !== "EMPLOYEE" ? shop || toStore : null,
//         assignedAt: new Date(),
//         remarks: remarks || "",
//         actionType,
//         shop: shop || null
//       });

//       console.log("Assignment created successfully:", assignment);

//       /* -------------------- UPDATE ASSET -------------------- */
//       const newStatus = getNextStatus(actionType);
      
//       await Asset.findByIdAndUpdate(assetId, {
//         status: newStatus,
//         custodian: custodianUpdate,
//         currentLocation: locationUpdate
//       });

//       console.log("Asset updated successfully with status:", newStatus);

//       return res.status(201).json({
//         message: "Asset transferred successfully",
//         assignment,
//         newStatus
//       });
//     } catch (createError) {
//       console.error("Error creating assignment:", createError);
//       return res.status(500).json({
//         message: "Failed to create assignment record",
//         error: createError.message
//       });
//     }

//   } catch (error) {
//     console.error("Transfer asset error:", error);
//     return res.status(500).json({
//       message: "Server error",
//       error: error.message
//     });
//   }
// };


//////////////////////////////////////////////////////////////////




// export const transferAsset = async (req, res) => {
//   try {
//     const {
//       assetId,
//       toEntityType,
//       toEmployee,
//       toStore,
//       remarks,
//       actionType,
//       shop
//     } = req.body;

//     console.log("Incoming transfer request:", req.body);

//     /* -------------------- BASIC VALIDATIONS -------------------- */
//     if (!assetId || !toEntityType || !actionType) {
//       return res.status(400).json({
//         message: "Asset ID, transfer target, and action type are required"
//       });
//     }

//     if (toEntityType === "EMPLOYEE" && !toEmployee) {
//       return res.status(400).json({
//         message: "Employee ID is required for employee transfer"
//       });
//     }

//     if (
//       (toEntityType === "STORE" || toEntityType === "MAINTENANCE_SHOP") &&
//       !shop &&
//       !toStore
//     ) {
//       return res.status(400).json({
//         message: "Shop/Store reference is required for store/maintenance transfer"
//       });
//     }

//     /* -------------------- FETCH ASSET -------------------- */
//     const asset = await Asset.findById(assetId);
//     if (!asset) return res.status(404).json({ message: "Asset not found" });
//     if (asset.isDeleted)
//       return res.status(400).json({ message: "Cannot transfer deleted asset" });

//     /* -------------------- FETCH CURRENT ASSIGNMENT -------------------- */
//     const currentAssignment = await Assignment.findOne({
//       assetId,
//       returnedAt: null
//     }).sort({ assignedAt: -1 });

//     console.log("Current assignment:", currentAssignment);

//     /* -------------------- RULE A: ONLY ONE ACTIVE MAINTENANCE -------------------- */
//     const isCurrentlyInMaintenance =
//       currentAssignment?.toEntityType === "MAINTENANCE_SHOP";

//     const isTargetMaintenance =
//       toEntityType === "MAINTENANCE_SHOP" &&
//       actionType === "TRANSFER_TO_MAINTENANCE";

//     // ❌ Block ONLY Maintenance → Maintenance
//     if (isCurrentlyInMaintenance && isTargetMaintenance) {
//       return res.status(400).json({
//         message:
//           "Asset is already under active maintenance. Complete or return it before sending again."
//       });
//     }

//     /* -------------------- CLOSE PREVIOUS ASSIGNMENT -------------------- */
//     if (currentAssignment) {
//       currentAssignment.returnedAt = new Date();
//       await currentAssignment.save();
//     }

//     /* -------------------- SOURCE INFO (FIXED) -------------------- */
//     let fromEntityType = "STORE";
//     let fromEmployee = null;
//     let fromStore =
//       asset.currentLocation?.shop ||
//       asset.location ||
//       currentAssignment?.toStore ||
//       null;

//     if (currentAssignment) {
//       fromEntityType = currentAssignment.toEntityType;
//       fromEmployee = currentAssignment.toEmployee || null;

//       // ✅ ONLY override if value exists
//       if (currentAssignment.toStore) {
//         fromStore = currentAssignment.toStore;
//       }
//     }

//     /* -------------------- TARGET VALIDATION -------------------- */
//     if (toEntityType === "EMPLOYEE") {
//       const employee = await Employee.findById(toEmployee);
//       if (!employee)
//         return res.status(404).json({ message: "Employee not found" });
//     }

//     /* -------------------- LOCATION + CUSTODIAN LOGIC -------------------- */
//     let locationUpdate = {};
//     let custodianUpdate = null;

//     if (toEntityType === "EMPLOYEE") {
//       locationUpdate = {
//         type: "EMPLOYEE",
//         employee: toEmployee,
//         shop: null
//       };
//       custodianUpdate = {
//         type: "EMPLOYEE",
//         employee: toEmployee,
//         department: null
//       };
//     } else if (toEntityType === "MAINTENANCE_SHOP") {
//       locationUpdate = {
//         type: "MAINTENANCE_SHOP",
//         employee: null,
//         shop: shop || toStore
//       };
//     } else if (toEntityType === "STORE") {
//       locationUpdate = {
//         type: "STORE",
//         employee: null,
//         shop: shop || toStore
//       };
//       custodianUpdate = {
//         type: "DEPARTMENT",
//         employee: null,
//         department: shop || toStore
//       };
//     }

//     /* -------------------- CREATE ASSIGNMENT HISTORY -------------------- */
//     try {
//       const assignment = await Assignment.create({
//         assetId,
//         fromEntityType,
//         toEntityType,
//         fromEmployee,
//         fromStore,
//         toEmployee: toEntityType === "EMPLOYEE" ? toEmployee : null,
//         toStore: toEntityType !== "EMPLOYEE" ? shop || toStore : null,
//         assignedAt: new Date(),
//         remarks: remarks || "",
//         actionType,
//         shop: shop || null
//       });

//       console.log("Assignment data to create:", {
//   assetId,
//   fromEntityType,
//   toEntityType,
//   fromEmployee,
//   fromStore,
//   toEmployee: toEntityType === "EMPLOYEE" ? toEmployee : null,
//   toStore: toEntityType !== "EMPLOYEE" ? shop || toStore : null,
//   assignedAt: new Date(),
//         remarks: remarks || "",
//   actionType,
//   shop: shop || null
// });

//       const newStatus = getNextStatus(actionType);

//       await Asset.findByIdAndUpdate(assetId, {
//         status: newStatus,
//         custodian: custodianUpdate,
//         currentLocation: locationUpdate
//       });

//       return res.status(201).json({
//         message: "Asset transferred successfully",
//         assignment,
//         newStatus
//       });
//     } catch (createError) {
//       console.error("Assignment creation failed:", createError);
//       return res.status(500).json({
//         message: "Failed to create assignment record",
//         error: createError.message
//       });
//     }

//   } catch (error) {
//     console.error("Transfer asset error:", error);
//     return res.status(500).json({
//       message: "Server error",
//       error: error.message
//     });
//   }
// };






//////////////////////////////////////////////////////////////








// export const transferAsset = async (req, res) => {
//   try {
//     const {
//       assetId,
//       toEntityType,
//       toEmployee,
//       toStore,
//       remarks,
//       actionType,
//       shop
//     } = req.body;

//     console.log("Incoming transfer request:", req.body);

//     /* -------------------- BASIC VALIDATIONS -------------------- */
//     if (!assetId || !toEntityType || !actionType) {
//       return res.status(400).json({
//         message: "Asset ID, transfer target, and action type are required"
//       });
//     }

//     if (toEntityType === "EMPLOYEE" && !toEmployee) {
//       return res.status(400).json({
//         message: "Employee ID is required for employee transfer"
//       });
//     }

//     if (
//       (toEntityType === "STORE" || toEntityType === "MAINTENANCE_SHOP") &&
//       !shop &&
//       !toStore
//     ) {
//       return res.status(400).json({
//         message: "Shop/Store reference is required for store/maintenance transfer"
//       });
//     }

//     /* -------------------- FETCH ASSET -------------------- */
//     const asset = await Asset.findById(assetId);
//     if (!asset) return res.status(404).json({ message: "Asset not found" });
//     if (asset.isDeleted)
//       return res.status(400).json({ message: "Cannot transfer deleted asset" });

//     /* -------------------- FETCH CURRENT ASSIGNMENT -------------------- */
//     const currentAssignment = await Assignment.findOne({
//       assetId,
//       returnedAt: null
//     }).sort({ assignedAt: -1 });

//     console.log("Current assignment:", currentAssignment);

//     /* -------------------- RULE A: ONLY ONE ACTIVE MAINTENANCE -------------------- */
//     const isCurrentlyInMaintenance =
//       currentAssignment?.toEntityType === "MAINTENANCE_SHOP";

//     const isTargetMaintenance =
//       toEntityType === "MAINTENANCE_SHOP" &&
//       actionType === "TRANSFER_TO_MAINTENANCE";

//     if (isCurrentlyInMaintenance && isTargetMaintenance) {
//       return res.status(400).json({
//         message:
//           "Asset is already under active maintenance. Complete or return it before sending again."
//       });
//     }

//     /* -------------------- CLOSE PREVIOUS ASSIGNMENT -------------------- */
//     if (currentAssignment) {
//       currentAssignment.returnedAt = new Date();
//       await currentAssignment.save();
//     }

//     /* -------------------- SOURCE INFO -------------------- */
//     let fromEntityType = "STORE";
//     let fromEmployee = null;

//     // Normalize fromStore to string
//     let fromStore =
//       currentAssignment?.toStore ||
//       (asset.currentLocation?.shop ? asset.currentLocation.shop.toString() : null) ||
//       asset.location ||
//       null;

//     if (currentAssignment) {
//       fromEntityType = currentAssignment.toEntityType;
//       fromEmployee = currentAssignment.toEmployee || null;

//       if (currentAssignment.toStore) {
//         fromStore = currentAssignment.toStore;
//       }
//     }

//     /* -------------------- TARGET LOCATION + CUSTODIAN -------------------- */
//     let locationUpdate = {};
//     let custodianUpdate = null;

//     if (toEntityType === "EMPLOYEE") {
//       locationUpdate = {
//         type: "EMPLOYEE",
//         employee: mongoose.Types.ObjectId(toEmployee),
//         shop: null
//       };
//       custodianUpdate = {
//         type: "EMPLOYEE",
//         employee: mongoose.Types.ObjectId(toEmployee),
//         department: null
//       };
//     } else if (toEntityType === "MAINTENANCE_SHOP") {
//       locationUpdate = {
//         type: "MAINTENANCE_SHOP",
//         employee: null,
//         shop: mongoose.Types.ObjectId(shop || toStore)
//       };
//     } else if (toEntityType === "STORE") {
//       locationUpdate = {
//         type: "STORE",
//         employee: null,
//         shop: mongoose.Types.ObjectId(shop || toStore)
//       };
//       custodianUpdate = {
//         type: "DEPARTMENT",
//         employee: null,
//         department: shop || toStore
//       };
//     }

//     /* -------------------- TARGET EMPLOYEE VALIDATION -------------------- */
//     if (toEntityType === "EMPLOYEE") {
//       const employee = await Employee.findById(toEmployee);
//       if (!employee)
//         return res.status(404).json({ message: "Employee not found" });
//     }

//     /* -------------------- CREATE ASSIGNMENT -------------------- */
//     const assignment = await Assignment.create({
//       assetId: mongoose.Types.ObjectId(assetId),
//       fromEntityType,
//       toEntityType,
//       fromEmployee: fromEmployee ? mongoose.Types.ObjectId(fromEmployee) : null,
//       fromStore: fromStore || null,
//       toEmployee: toEntityType === "EMPLOYEE" ? mongoose.Types.ObjectId(toEmployee) : null,
//       toStore: toEntityType !== "EMPLOYEE" ? (shop || toStore) : null,
//       assignedAt: new Date(),
//       remarks: remarks || "",
//       actionType,
//       shop: toEntityType === "MAINTENANCE_SHOP" ? mongoose.Types.ObjectId(shop) : null
//     });

//     console.log("Assignment created successfully:", assignment);

//     /* -------------------- UPDATE ASSET -------------------- */
//     const newStatus = getNextStatus(actionType);

//     await Asset.findByIdAndUpdate(assetId, {
//       status: newStatus,
//       custodian: custodianUpdate,
//       currentLocation: locationUpdate
//     });

//     return res.status(201).json({
//       message: "Asset transferred successfully",
//       assignment,
//       newStatus
//     });
//   } catch (error) {
//     console.error("Transfer asset error:", error);
//     return res.status(500).json({
//       message: "Server error",
//       error: error.message
//     });
//   }
// };




// export const transferAsset = async (req, res) => {
//   try {
//     const { assetId, toEntityType, toEmployee, toStore, remarks, actionType, shop } = req.body;

//     console.log("Incoming transfer request:", req.body);

//     /* -------------------- BASIC VALIDATIONS -------------------- */
//     if (!assetId || !toEntityType || !actionType) {
//       return res.status(400).json({
//         message: "Asset ID, transfer target, and action type are required",
//       });
//     }

//     if (toEntityType === "EMPLOYEE" && !toEmployee) {
//       return res.status(400).json({
//         message: "Employee ID is required for employee transfer",
//       });
//     }

//     if ((toEntityType === "STORE" || toEntityType === "MAINTENANCE_SHOP") && !shop && !toStore) {
//       return res.status(400).json({
//         message: "Shop/Store reference is required for store/maintenance transfer",
//       });
//     }

//     /* -------------------- FETCH ASSET -------------------- */
//     const asset = await Asset.findById(assetId);
//     if (!asset) return res.status(404).json({ message: "Asset not found" });
//     if (asset.isDeleted) return res.status(400).json({ message: "Cannot transfer deleted asset" });

//     /* -------------------- FETCH CURRENT ASSIGNMENT -------------------- */
//     const currentAssignment = await Assignment.findOne({ assetId, returnedAt: null }).sort({ assignedAt: -1 });
//     console.log("Current assignment:", currentAssignment);

//     /* -------------------- RULE A: ONLY ONE ACTIVE MAINTENANCE -------------------- */
//     const isCurrentlyInMaintenance = currentAssignment?.toEntityType === "MAINTENANCE_SHOP";
//     const isTargetMaintenance = toEntityType === "MAINTENANCE_SHOP" && actionType === "TRANSFER_TO_MAINTENANCE";

//     if (isCurrentlyInMaintenance && isTargetMaintenance) {
//       return res.status(400).json({
//         message:
//           "Asset is already under active maintenance. Complete or return it before sending again.",
//       });
//     }

//     /* -------------------- CLOSE PREVIOUS ASSIGNMENT -------------------- */
//     if (currentAssignment) {
//       currentAssignment.returnedAt = new Date();
//       await currentAssignment.save();
//     }

//     /* -------------------- SOURCE INFO -------------------- */
//     let fromEntityType = "STORE";
//     let fromEmployee = null;

//     // Normalize fromStore to string
//     let fromStore = null;
//     if (currentAssignment?.toStore) fromStore = currentAssignment.toStore.toString();
//     else if (asset.currentLocation?.shop) fromStore = asset.currentLocation.shop.toString();
//     else if (asset.location) fromStore = asset.location;

//     if (currentAssignment) {
//       fromEntityType = currentAssignment.toEntityType;
//       fromEmployee = currentAssignment.toEmployee || null;
//     }

//     /* -------------------- TARGET LOCATION + CUSTODIAN -------------------- */
//     let locationUpdate = {};
//     let custodianUpdate = null;

//     if (toEntityType === "EMPLOYEE") {
//       locationUpdate = { type: "EMPLOYEE", employee: mongoose.Types.ObjectId(toEmployee), shop: null };
//       custodianUpdate = { type: "EMPLOYEE", employee: mongoose.Types.ObjectId(toEmployee), department: null };
//     } else if (toEntityType === "MAINTENANCE_SHOP") {
//       locationUpdate = { type: "MAINTENANCE_SHOP", employee: null, shop: mongoose.Types.ObjectId(shop || toStore) };
//     } else if (toEntityType === "STORE") {
//       locationUpdate = { type: "STORE", employee: null, shop: mongoose.Types.ObjectId(shop || toStore) };
//       custodianUpdate = { type: "DEPARTMENT", employee: null, department: shop || toStore };
//     }

//     /* -------------------- TARGET EMPLOYEE VALIDATION -------------------- */
//     if (toEntityType === "EMPLOYEE") {
//       const employee = await Employee.findById(toEmployee);
//       if (!employee) return res.status(404).json({ message: "Employee not found" });
//     }

//     /* -------------------- CREATE ASSIGNMENT -------------------- */
//     try {
//       const assignment = await Assignment.create({
//         assetId: mongoose.Types.ObjectId(assetId),
//         fromEntityType,
//         toEntityType,
//         fromEmployee: fromEmployee ? mongoose.Types.ObjectId(fromEmployee) : null,
//         fromStore: fromStore ? fromStore.toString() : null,
//         toEmployee: toEntityType === "EMPLOYEE" ? mongoose.Types.ObjectId(toEmployee) : null,
//         toStore: toEntityType !== "EMPLOYEE" ? (shop || toStore)?.toString() : null,
//         assignedAt: new Date(),
//         remarks: remarks || "",
//         actionType,
//         shop: shop ? mongoose.Types.ObjectId(shop) : null,
//       });

//       console.log("Assignment created successfully:", assignment);

//       /* -------------------- UPDATE ASSET -------------------- */
//       const newStatus = getNextStatus(actionType);

//       await Asset.findByIdAndUpdate(assetId, {
//         status: newStatus,
//         custodian: custodianUpdate,
//         currentLocation: locationUpdate,
//       });

//       return res.status(201).json({
//         message: "Asset transferred successfully",
//         assignment,
//         newStatus,
//       });
//     } catch (dbError) {
//       console.error("Database validation error:", dbError);
//       return res.status(500).json({
//         message: "Database validation error: " + dbError.message,
//         error: dbError.message,
//       });
//     }
//   } catch (error) {
//     console.error("Transfer asset error:", error);
//     return res.status(500).json({
//       message: "Server error",
//       error: error.message,
//     });
//   }
// };




// export const transferAsset = async (req, res) => {
//   try {
//     const { assetId, toEntityType, toEmployee, toStore, remarks, actionType, shop } = req.body;

//     console.log("Incoming transfer request: req.body :=", req.body);

//     /* -------------------- BASIC VALIDATIONS -------------------- */
//     if (!assetId || !toEntityType || !actionType) {
//       return res.status(400).json({ message: "Asset ID, transfer target, and action type are required" });
//     }

//     if (toEntityType === "EMPLOYEE" && !toEmployee) {
//       return res.status(400).json({ message: "Employee ID is required for employee transfer" });
//     }

//     if ((toEntityType === "STORE" || toEntityType === "MAINTENANCE_SHOP") && !shop && !toStore) {
//       return res.status(400).json({ message: "Shop/Store reference is required for store/maintenance transfer" });
//     }

//     /* -------------------- FETCH ASSET -------------------- */
//     const asset = await Asset.findById(assetId);
//     if (!asset) return res.status(404).json({ message: "Asset not found" });
//     if (asset.isDeleted) return res.status(400).json({ message: "Cannot transfer deleted asset" });

//     /* -------------------- FETCH CURRENT ASSIGNMENT -------------------- */
//     const currentAssignment = await Assignment.findOne({ assetId, returnedAt: null }).sort({ assignedAt: -1 });
//     console.log("Current assignment:", currentAssignment);

//     /* -------------------- RULE A: ONLY ONE ACTIVE MAINTENANCE -------------------- */
//     const isCurrentlyInMaintenance = currentAssignment?.toEntityType === "MAINTENANCE_SHOP";
//     const isTargetMaintenance = toEntityType === "MAINTENANCE_SHOP" && actionType === "TRANSFER_TO_MAINTENANCE";
//     if (isCurrentlyInMaintenance && isTargetMaintenance) {
//       return res.status(400).json({
//         message: "Asset is already under active maintenance. Complete or return it before sending again.",
//       });
//     }

//     /* -------------------- CLOSE PREVIOUS ASSIGNMENT -------------------- */
//     if (currentAssignment) {
//       currentAssignment.returnedAt = new Date();
//       await currentAssignment.save();
//     }

//     /* -------------------- SOURCE INFO -------------------- */
//     let fromEntityType = "STORE";
//     let fromEmployee = null;

//     // Normalize fromStore to string safely
//     let fromStore = null;
//     if (currentAssignment?.toStore) fromStore = currentAssignment.toStore.toString();
//     else if (asset.currentLocation?.shop) fromStore = asset.currentLocation.shop ? asset.currentLocation.shop.toString() : null;
//     else if (asset.location) fromStore = asset.location;

//     if (currentAssignment) {
//       fromEntityType = currentAssignment.toEntityType;
//       fromEmployee = currentAssignment.toEmployee || null;
//     }

//     /* -------------------- TARGET LOCATION + CUSTODIAN -------------------- */
//     let locationUpdate = {};
//     let custodianUpdate = null;

//     if (toEntityType === "EMPLOYEE") {
//       locationUpdate = { type: "EMPLOYEE", employee: mongoose.Types.ObjectId(toEmployee), shop: null };
//       custodianUpdate = { type: "EMPLOYEE", employee: mongoose.Types.ObjectId(toEmployee), department: null };
//     } else if (toEntityType === "MAINTENANCE_SHOP") {
//       locationUpdate = { type: "MAINTENANCE_SHOP", employee: null, shop: mongoose.Types.ObjectId(shop || toStore) };
//     } else if (toEntityType === "STORE") {
//       locationUpdate = { type: "STORE", employee: null, shop: mongoose.Types.ObjectId(shop || toStore) };
//       custodianUpdate = { type: "DEPARTMENT", employee: null, department: shop || toStore };
//     }

//     /* -------------------- TARGET EMPLOYEE VALIDATION -------------------- */
//     if (toEntityType === "EMPLOYEE") {
//       const employee = await Employee.findById(toEmployee);
//       if (!employee) return res.status(404).json({ message: "Employee not found" });
//     }

//     /* -------------------- CREATE ASSIGNMENT -------------------- */
//     try {
//       const assignment = await Assignment.create({
//         assetId: mongoose.Types.ObjectId(assetId),
//         fromEntityType,
//         toEntityType,
//         fromEmployee: fromEmployee ? mongoose.Types.ObjectId(fromEmployee) : null,
//         fromStore: fromStore, // <-- already string
//         toEmployee: toEntityType === "EMPLOYEE" ? mongoose.Types.ObjectId(toEmployee) : null,
//         toStore: toEntityType !== "EMPLOYEE" ? (shop || toStore) : null, // <-- keep as string
//         assignedAt: new Date(),
//         remarks: remarks || "",
//         actionType,
//         shop: shop ? mongoose.Types.ObjectId(shop) : null, // <-- convert to ObjectId if exists
//       });

//       console.log("Assignment created successfully:", assignment);

//       /* -------------------- UPDATE ASSET -------------------- */
//       const newStatus = getNextStatus(actionType);

//       await Asset.findByIdAndUpdate(assetId, {
//         status: newStatus,
//         custodian: custodianUpdate,
//         currentLocation: locationUpdate,
//       });

//       return res.status(201).json({
//         message: "Asset transferred successfully",
//         assignment,
//         newStatus,
//       });
//     } catch (dbError) {
//       console.error("Database validation error:", dbError);
//       return res.status(500).json({
//         message: "Database validation error: " + dbError.message,
//         error: dbError.message,
//       });
//     }
//   } catch (error) {
//     console.error("Transfer asset error:", error);
//     return res.status(500).json({
//       message: "Server error",
//       error: error.message,
//     });
//   }
// };






export const transferAsset = async (req, res) => {
  try {
    const { assetId, toEntityType, toEmployee, toStore, remarks, actionType, shop } = req.body;

    console.log("Incoming transfer request:", req.body);

    /* -------------------- BASIC VALIDATIONS -------------------- */
    if (!assetId || !toEntityType || !actionType) {
      return res.status(400).json({ message: "Asset ID, transfer target, and action type are required" });
    }

    if (toEntityType === "EMPLOYEE" && !toEmployee) {
      return res.status(400).json({ message: "Employee ID is required for employee transfer" });
    }

    if ((toEntityType === "STORE" || toEntityType === "MAINTENANCE_SHOP") && !shop && !toStore) {
      return res.status(400).json({ message: "Shop/Store reference is required for store/maintenance transfer" });
    }

    /* -------------------- FETCH ASSET -------------------- */
    const asset = await Asset.findById(assetId);
    if (!asset) return res.status(404).json({ message: "Asset not found" });
    if (asset.isDeleted) return res.status(400).json({ message: "Cannot transfer deleted asset" });

    /* -------------------- FETCH CURRENT ASSIGNMENT -------------------- */
    const currentAssignment = await Assignment.findOne({ assetId, returnedAt: null }).sort({ assignedAt: -1 });
    console.log("Current assignment:", currentAssignment);

    /* -------------------- RULE A: ONLY ONE ACTIVE MAINTENANCE -------------------- */
    const isCurrentlyInMaintenance = currentAssignment?.toEntityType === "MAINTENANCE_SHOP";
    const isTargetMaintenance = toEntityType === "MAINTENANCE_SHOP" && actionType === "TRANSFER_TO_MAINTENANCE";
    if (isCurrentlyInMaintenance && isTargetMaintenance) {
      return res.status(400).json({
        message: "Asset is already under active maintenance. Complete or return it before sending again.",
      });
    }

    /* -------------------- CLOSE PREVIOUS ASSIGNMENT -------------------- */
    if (currentAssignment) {
      currentAssignment.returnedAt = new Date();
      await currentAssignment.save();
    }

    /* -------------------- SOURCE INFO -------------------- */
    let fromEntityType = "STORE";
    let fromEmployee = null;
    let fromStore = null;

    if (currentAssignment) {
      fromEntityType = currentAssignment.toEntityType;
      fromEmployee = currentAssignment.toEmployee || null;
      fromStore = currentAssignment.toStore || null;
    } else if (asset.currentLocation?.shop) {
      fromStore = asset.currentLocation.shop.toString();
    } else if (asset.location) {
      fromStore = asset.location;
    }

    /* -------------------- TARGET LOCATION + CUSTODIAN -------------------- */
    let locationUpdate = {};
    let custodianUpdate = null;

    if (toEntityType === "EMPLOYEE") {
      locationUpdate = { type: "EMPLOYEE", employee: new mongoose.Types.ObjectId(toEmployee), shop: null };
      custodianUpdate = { type: "EMPLOYEE", employee: new mongoose.Types.ObjectId(toEmployee), department: null };
    } else if (toEntityType === "MAINTENANCE_SHOP") {
      locationUpdate = { type: "MAINTENANCE_SHOP", employee: null, shop: new mongoose.Types.ObjectId(shop || toStore) };
    } else if (toEntityType === "STORE") {
      locationUpdate = { type: "STORE", employee: null, shop: new mongoose.Types.ObjectId(shop || toStore) };
      custodianUpdate = { type: "DEPARTMENT", employee: null, department: shop || toStore };
    }

    /* -------------------- TARGET EMPLOYEE VALIDATION -------------------- */
    if (toEntityType === "EMPLOYEE") {
      const employee = await Employee.findById(toEmployee);
      if (!employee) return res.status(404).json({ message: "Employee not found" });
    }

    /* -------------------- CREATE ASSIGNMENT -------------------- */
    const assignment = await Assignment.create({
      assetId: new mongoose.Types.ObjectId(assetId),
      fromEntityType,
      toEntityType,
      fromEmployee: fromEmployee ? new mongoose.Types.ObjectId(fromEmployee) : null,
      fromStore: fromStore,
      toEmployee: toEntityType === "EMPLOYEE" ? new mongoose.Types.ObjectId(toEmployee) : null,
      toStore: toEntityType !== "EMPLOYEE" ? shop || toStore : null,
      assignedAt: new Date(),
      remarks: remarks || "",
      actionType,
      shop: shop ? new mongoose.Types.ObjectId(shop) : null
    });

    console.log("Assignment created successfully:", assignment);

    /* -------------------- UPDATE ASSET -------------------- */
    const newStatus = getNextStatus(actionType);

    await Asset.findByIdAndUpdate(assetId, {
      status: newStatus,
      custodian: custodianUpdate,
      currentLocation: locationUpdate
    });

    return res.status(201).json({
      message: "Asset transferred successfully",
      assignment,
      newStatus
    });

  } catch (error) {
    console.error("Transfer asset error:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};








//////////////////////////////////////////////////////////////////







// Return asset to store
export const returnAssetToStore = async (req, res) => {
  try {
    const { assetId, remarks, actionType = "RETURN", toEmployee } = req.body;

    if (!assetId) {
      return res.status(400).json({ message: "Asset ID is required" });
    }

    const asset = await Asset.findById(assetId);
    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }

    if (asset.isDeleted) {
      return res.status(400).json({ message: "Cannot return deleted asset" });
    }

    if (actionType === "RETURN_FROM_MAINTENANCE" && toEmployee) {
      return transferAsset(req, res);
    }

    const transitionValidation = validateTransition(asset.status, actionType);
    if (!transitionValidation.valid) {
      return res.status(400).json({ message: transitionValidation.message });
    }

    const currentAssignment = await Assignment.findOne({
      assetId,
      returnedAt: null
    }).sort({ assignedAt: -1 });

    if (!currentAssignment) {
      return res.status(400).json({ message: "No active assignment found" });
    }

    currentAssignment.returnedAt = new Date();
    currentAssignment.actionType = actionType;
    if (remarks) {
      currentAssignment.remarks = currentAssignment.remarks 
        ? `${currentAssignment.remarks}\nReturn: ${remarks}` 
        : `Return: ${remarks}`;
    }
    await currentAssignment.save();

    const newStatus = getNextStatus(actionType);
    
    // ✅ UPDATED: Clear custodian when returning to store
    await Asset.findByIdAndUpdate(assetId, { 
      status: newStatus,
      custodian: null,
      currentLocation: {
        type: "STORE",
        employee: null,
        shop: null
      }
    });

    res.json({
      message: "Asset returned successfully",
      assignment: currentAssignment,
      newStatus
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get asset history
export const getAssetHistory = async (req, res) => {
  try {
    const { id } = req.params;

    const asset = await Asset.findById(id);
    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }

    const assignments = await Assignment.find({ assetId: id })
      .populate('fromEmployee', 'name email code')
      .populate('toEmployee', 'name email code')
      .populate('shop', 'name code')
      .sort({ assignedAt: -1 });

    const history = assignments.map(assignment => {
      let fromLocation;
      
      if (assignment.fromEntityType === 'MAINTENANCE_SHOP') {
        fromLocation = assignment.shop?.name || 'Unknown Shop';
      } else if (assignment.fromEntityType === 'EMPLOYEE') {
        if (assignment.fromEmployee?.name) {
          fromLocation = assignment.fromEmployee.name;
        } else if (typeof assignment.fromEmployee === 'string') {
          fromLocation = assignment.shop?.name || assignment.fromEmployee;
        } else {
          fromLocation = 'Unknown Employee';
        }
      } else if (assignment.fromEntityType === 'MAINTENANCE_SHOP') {
        fromLocation = assignment.shop?.name || assignment.fromStore || 'Unknown Shop';
      } else {
        fromLocation = assignment.fromStore || 'Store';
      }

      let toLocation;
      
      if (assignment.toEntityType === 'EMPLOYEE') {
        if (assignment.toEmployee?.name) {
          toLocation = assignment.toEmployee.name;
        } else if (typeof assignment.toEmployee === 'string') {
          toLocation = assignment.toEmployee;
        } else {
          toLocation = 'Unknown Employee';
        }
      } else if (assignment.toEntityType === 'MAINTENANCE_SHOP') {
        toLocation = assignment.shop?.name || assignment.toStore || 'Unknown Shop';
      } else {
        toLocation = assignment.toStore || 'Store';
      }

      return {
        id: assignment._id,
        actionType: assignment.actionType,
        from: {
          type: assignment.fromEntityType,
          name: fromLocation,
          employee: assignment.fromEmployee,
          store: assignment.fromStore
        },
        to: {
          type: assignment.toEntityType,
          name: toLocation,
          employee: assignment.toEmployee,
          store: assignment.toStore,
          shop: assignment.shop
        },
        statusAfterAction: getNextStatus(assignment.actionType),
        date: assignment.assignedAt,
        returnedAt: assignment.returnedAt,
        remarks: assignment.remarks,
        isActive: !assignment.returnedAt
      };
    });

    res.json({
      asset: {
        id: asset._id,
        name: asset.name,
        assetCode: asset.assetCode,
        currentStatus: asset.status,
        currentLocation: asset.currentLocation
      },
      history,
      totalRecords: history.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get current assignment for an asset
// export const getCurrentAssignment = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const assignment = await Assignment.findOne({
//       assetId: id,
//       returnedAt: null
//     })
//     .populate('toEmployee', 'name code email')
//     .populate('shop', 'name code')
//     .populate('toStore', 'name')
//     .sort({ assignedAt: -1 });

//     if (!assignment) {
//       return res.json(null);
//     }

//     const currentAssignment = {
//       _id: assignment._id,
//       assetId: assignment.assetId,
//       toEntityType: assignment.toEntityType,
//       toEmployee: assignment.toEmployee,
//       toStore: assignment.toStore,
//       shop: assignment.shop,
//       assignedAt: assignment.assignedAt,
//       actionType: assignment.actionType
//     };

//     res.json(currentAssignment);
//   } catch (error) {
//     console.error("Get current assignment error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };





export const getCurrentAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findOne({
      assetId: req.params.assetId,
      returnedAt: null
    })
      .populate("toEmployee", "name employeeCode")
      .populate("shop", "name");

    // ✅ IMPORTANT: return null safely
    return res.status(200).json({
      assignment: assignment || null
    });

  } catch (error) {
    console.error("getCurrentAssignment error:", error);
    res.status(500).json({
      message: "Failed to fetch current assignment"
    });
  }
};
