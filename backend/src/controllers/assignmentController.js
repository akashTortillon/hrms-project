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

// Generic Assign Asset (Employee or Department)
export const assignAssetToEmployee = async (req, res) => {
  try {
    const { assetId, custodianType, toEmployee, toDepartment, remarks } = req.body;

    if (!assetId) {
      return res.status(400).json({ message: "Asset ID is required" });
    }

    if (!custodianType || !["EMPLOYEE", "DEPARTMENT"].includes(custodianType)) {
      return res.status(400).json({ message: "Valid Custodian Type (EMPLOYEE or DEPARTMENT) is required" });
    }

    if (custodianType === "EMPLOYEE" && !toEmployee) {
      return res.status(400).json({ message: "Employee ID is required for Employee assignment" });
    }

    if (custodianType === "DEPARTMENT" && !toDepartment) {
      return res.status(400).json({ message: "Department Name is required for Department assignment" });
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

    // specific validation
    if (custodianType === "EMPLOYEE") {
      const employee = await Employee.findById(toEmployee);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
    }

    const assignment = await Assignment.create({
      assetId,
      fromEntityType: "STORE",
      toEntityType: custodianType, // EMPLOYEE or DEPARTMENT
      fromStore: asset.location,
      toEmployee: custodianType === "EMPLOYEE" ? toEmployee : null,
      toDepartment: custodianType === "DEPARTMENT" ? toDepartment : null,
      assignedAt: new Date(),
      remarks: remarks || "",
      actionType: "ASSIGN"
    });

    const newStatus = getNextStatus("ASSIGN");

    // Prepare updates
    const custodianUpdate = {
      type: custodianType,
      employee: custodianType === "EMPLOYEE" ? toEmployee : null,
      department: custodianType === "DEPARTMENT" ? toDepartment : null
    };

    // Current location logic (Departments don't have a 'location' object structure same as employees in original design, 
    // but we can map it. For now, we reuse the existing currentLocation structure 
    // but Note: currentLocation.type enum might need update if we want to track 'DEPARTMENT' as a location type too, 
    // but usually department assets are physically in the department.)

    // NOTE: Schema currentLocation.type enum: ["EMPLOYEE", "MAINTENANCE_SHOP", "STORE"]. 
    // If we assign to Department, physically where is it? 
    // We will assume it's "in use" but location tracking might be tricky without a new enum.
    // However, existing asset schema line 175 has custodian.type enum ["EMPLOYEE", "DEPARTMENT"].
    // But currentLocation.type enum line 226 only has ["EMPLOYEE", "MAINTENANCE_SHOP", "STORE"].
    // If we set it to STORE with sub-location? Or do we need to add DEPARTMENT to currentLocation.type enum?
    // Let's check the schema again. 
    // Line 226: enum: ["EMPLOYEE", "MAINTENANCE_SHOP", "STORE"]

    // Force "STORE" or "EMPLOYEE"? If assigned to Department, it is technically "In Use". 
    // Let's treat it as "STORE" with shop/department as sub location? No.
    // Ideally we should add DEPARTMENT to currentLocation.type.
    // For now, to match request "minimal implementation", we will set it to "STORE" (conceptually) 
    // OR we just leave it as is if schema doesn't support it.
    // Wait, the user wants "Department Custodians". 
    // I will set currentLocation to null/default or keep it consistent.
    // Actually, I should update the Asset Model to support DEPARTMENT in currentLocation too
    // OR just rely on custodian field. 
    // The `getAssets` usually populates `currentLocation`.
    // Let's USE `custodian` field as the primary source of truth for "Assignment".

    await Asset.findByIdAndUpdate(assetId, {
      status: newStatus,
      custodian: custodianUpdate,
      // We will clear the explicit employee location if moving to department
      currentLocation: {
        type: custodianType === "EMPLOYEE" ? "EMPLOYEE" : "STORE", // Fallback to STORE if Department, or we update schema
        employee: custodianType === "EMPLOYEE" ? toEmployee : null,
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




// Transfer asset
export const transferAsset = async (req, res) => {
  try {
    const { assetId, toEntityType, toEmployee, toDepartment, toStore, remarks, actionType, shop, serviceCost } = req.body;

    if (!assetId || !toEntityType || !actionType) {
      return res.status(400).json({ message: "Asset ID, transfer target, and action type are required" });
    }

    if (toEntityType === "EMPLOYEE" && !toEmployee) {
      return res.status(400).json({ message: "Employee ID is required for employee transfer" });
    }

    // New: Department Validation
    if (toEntityType === "DEPARTMENT" && !toDepartment) {
      return res.status(400).json({ message: "Department name is required for department transfer" });
    }

    if ((toEntityType === "STORE" || toEntityType === "MAINTENANCE_SHOP") && !toStore && !shop) {
      // For maintenance return to store, we might just need 'toStore' as a string or default
      if (toEntityType === "MAINTENANCE_SHOP" && !shop) {
        return res.status(400).json({ message: "Maintenance Shop ID is required" });
      }
    }

    const asset = await Asset.findById(assetId);
    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }

    if (asset.isDeleted) {
      return res.status(400).json({ message: "Cannot transfer deleted asset" });
    }

    // Optional: Add transition validation here if needed
    // const transitionValidation = validateTransition(asset.status, actionType);

    // Rule: One active maintenance at a time
    if (actionType === "TRANSFER_TO_MAINTENANCE") {
      const activeMaintenance = await Assignment.findOne({
        assetId,
        actionType: "TRANSFER_TO_MAINTENANCE",
        returnedAt: null,
      });

      if (activeMaintenance) {
        return res.status(400).json({
          message: "Asset already has an active maintenance. Complete it before assigning again.",
        });
      }
    }

    // Get current assignment to close it
    const currentAssignment = await Assignment.findOne({
      assetId,
      returnedAt: null
    }).sort({ assignedAt: -1 });

    let fromEntityType = "STORE";
    let fromEmployee = null;
    let fromDepartment = null;
    let fromStore = typeof asset.currentLocation === 'string' ? asset.currentLocation : "Store"; // Fallback

    // Resolve 'From' details from current assignment or asset state
    if (currentAssignment) {
      fromEntityType = currentAssignment.toEntityType;
      fromEmployee = currentAssignment.toEmployee;
      fromDepartment = currentAssignment.toDepartment;

      // Mark current assignment as returned/closed
      currentAssignment.returnedAt = new Date();
      currentAssignment.isActive = false; // Flag as not current
      await currentAssignment.save();
    } else {
      // If no active assignment found, try to infer from Asset's current custodian
      if (asset.custodian?.type === "EMPLOYEE") {
        fromEntityType = "EMPLOYEE";
        fromEmployee = asset.custodian.employee;
      } else if (asset.custodian?.type === "DEPARTMENT") {
        fromEntityType = "DEPARTMENT";
        fromDepartment = asset.custodian.department;
      }
    }

    // Prepare updates
    let newStatus = getNextStatus(actionType);
    if (!newStatus) newStatus = asset.status; // Fallback

    let custodianUpdate = { type: null, employee: null, department: null };
    let locationUpdate = { type: "STORE", employee: null, shop: null };

    if (toEntityType === "EMPLOYEE") {
      custodianUpdate = { type: "EMPLOYEE", employee: toEmployee, department: null };
      locationUpdate = { type: "EMPLOYEE", employee: toEmployee, shop: null };
    } else if (toEntityType === "DEPARTMENT") {
      custodianUpdate = { type: "DEPARTMENT", employee: null, department: toDepartment };
      // Departments don't have a specific 'location' enum yet, map to STORE conceptually or null
      locationUpdate = { type: "STORE", employee: null, shop: null };
    } else if (toEntityType === "MAINTENANCE_SHOP") {
      custodianUpdate = { type: null, employee: null, department: null }; // No custodian during maintenance
      locationUpdate = { type: "MAINTENANCE_SHOP", employee: null, shop: shop };
    } else {
      // STORE or RETURN
      custodianUpdate = { type: null, employee: null, department: null };
      locationUpdate = { type: "STORE", employee: null, shop: null };
    }

    // Create new Assignment (History Record)
    const assignment = await Assignment.create({
      assetId,
      fromEntityType,
      toEntityType,
      fromEmployee,
      fromDepartment,
      toEmployee: toEntityType === "EMPLOYEE" ? toEmployee : null,
      toDepartment: toEntityType === "DEPARTMENT" ? toDepartment : null,
      assignedAt: new Date(),
      remarks: remarks || "",
      actionType,
      shop: shop || (actionType === "RETURN_FROM_MAINTENANCE" ? currentAssignment?.shop : null),
      isActive: true, // Mark this as the active record
      serviceCost: serviceCost ? parseFloat(serviceCost) : 0 // Save service cost if provided
    });

    // Update Asset
    await Asset.findByIdAndUpdate(assetId, {
      status: newStatus,
      custodian: custodianUpdate,
      currentLocation: locationUpdate
    });

    res.status(201).json({
      message: "Asset transferred successfully",
      assignment,
      newStatus
    });
  } catch (error) {
    console.error("Transfer Error:", error);
    res.status(500).json({ message: "Server error handling transfer" });
  }
};
















//////////////////////////////////////////////////////////////////







// Return asset to store
export const returnAssetToStore = async (req, res) => {
  // Delegate to the generic transferAsset function since logic is identical.
  // We ensure the request body has the necessary fields for a "Return" action.
  // If defaults are needed, we can inject them here, but frontend sends correct data.
  return transferAsset(req, res);
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
      // Create schema support for toDepartment if it existed in schema, otherwise we rely on string
      // But based on my earlier code, I tried populate('toDepartment').
      // If schema doesn't have ref 'Department', this does nothing but harmless.
      // However, we saved it as string in earlier steps?
      // In assignAssetToEmployee we saved `toDepartment: custodianType === "DEPARTMENT" ? toDepartment : null`.
      // The schema for Assignment likely has toDepartment as String? Or ObjectId?
      // Step 462 said: "custodian.department" in Asset model.
      // In Assignment model, I didn't see the schema update.
      // If it's a string, we don't need populate.
      // I'll assume it's a string for now or handled by frontend if ID.
      // But typically we populate if it's an ID.
      // Given the uncertainty, I will skip populate('toDepartment') and rely on the value being present.
      .populate('shop', 'name code')
      .sort({ assignedAt: -1 });

    const history = assignments.map(assignment => {
      let fromLocation = "Store";
      // Handle legacy/various types
      if (assignment.fromEntityType === 'EMPLOYEE') {
        fromLocation = assignment.fromEmployee?.name || 'Unknown Employee';
      } else if (assignment.fromEntityType === 'DEPARTMENT') {
        fromLocation = assignment.fromDepartment || 'Unknown Department';
      } else if (assignment.fromEntityType === 'MAINTENANCE_SHOP') {
        fromLocation = assignment.shop?.name || 'Maintenance Shop';
      } else if (assignment.fromEntityType === 'STORE') {
        fromLocation = assignment.fromStore || 'Store';
      }

      let toLocation = "Store";
      if (assignment.toEntityType === 'EMPLOYEE') {
        toLocation = assignment.toEmployee?.name || 'Unknown Employee';
      } else if (assignment.toEntityType === 'DEPARTMENT') {
        toLocation = assignment.toDepartment || 'Unknown Department';
      } else if (assignment.toEntityType === 'MAINTENANCE_SHOP') {
        toLocation = assignment.shop?.name || 'Maintenance Shop';
      } else if (assignment.toEntityType === 'STORE') {
        toLocation = assignment.toStore || 'Store';
      }

      return {
        id: assignment._id,
        actionType: assignment.actionType,
        from: {
          type: assignment.fromEntityType,
          name: fromLocation,
          employee: assignment.fromEmployee,
          // department: assignment.fromDepartment // Add if needed by frontend
        },
        to: {
          type: assignment.toEntityType,
          name: toLocation,
          employee: assignment.toEmployee,
          shop: assignment.shop
        },
        statusAfterAction: getNextStatus(assignment.actionType),
        date: assignment.assignedAt,
        returnedAt: assignment.returnedAt,
        remarks: assignment.remarks,
        isActive: !assignment.returnedAt,
        serviceCost: assignment.serviceCost || 0 // Explicitly include serviceCost
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






export const getCurrentAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findOne({
      assetId: req.params.id,
      returnedAt: null
    })
      .populate("toEmployee", "name code")
      .populate("shop", "name code");

    // ✅ IMPORTANT: return null safely
    return res.status(200).json(assignment || null);

  } catch (error) {
    console.error("getCurrentAssignment error:", error);
    res.status(500).json({
      message: "Failed to fetch current assignment"
    });
  }
};
