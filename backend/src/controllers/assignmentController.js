import Assignment from "../models/assignmentModel.js";
import Asset from "../models/assetModel.js";
import Employee from "../models/employeeModel.js";

// Asset lifecycle validation helpers
const VALID_TRANSITIONS = {
  "Available": ["ASSIGN"], // Available can only be assigned
  "In Use": ["TRANSFER_TO_MAINTENANCE", "RETURN"], // In Use can go to maintenance or be returned
  "Under Maintenance": ["RETURN_FROM_MAINTENANCE"] // Under Maintenance can only return
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
  const statusMap = {
    "ASSIGN": "In Use",
    "TRANSFER_TO_MAINTENANCE": "Under Maintenance",
    "RETURN_FROM_MAINTENANCE": "In Use",
    "RETURN": "Available"
  };
  return statusMap[actionType] || null;
};

// Assign asset to employee
export const assignAssetToEmployee = async (req, res) => {
  try {
    const { assetId, toEmployee, remarks } = req.body;

    // Validation
    if (!assetId || !toEmployee) {
      return res.status(400).json({ message: "Asset ID and Employee ID are required" });
    }

    // Check if asset exists
    const asset = await Asset.findById(assetId);
    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }

    // Check if asset is soft deleted
    if (asset.isDeleted) {
      return res.status(400).json({ message: "Cannot assign deleted asset" });
    }

    // Validate lifecycle transition
    const transitionValidation = validateTransition(asset.status, "ASSIGN");
    if (!transitionValidation.valid) {
      return res.status(400).json({ message: transitionValidation.message });
    }

    // Check if employee exists
    const employee = await Employee.findById(toEmployee);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Create assignment record
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

    // Update asset status and currentLocation
    const newStatus = getNextStatus("ASSIGN");
    await Asset.findByIdAndUpdate(assetId, { 
      status: newStatus,
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

// Transfer asset
export const transferAsset = async (req, res) => {
  try {
    const { assetId, toEntityType, toEmployee, toStore, remarks, actionType, shop } = req.body;

    // Validation
    if (!assetId || !toEntityType || !actionType) {
      return res.status(400).json({ message: "Asset ID, transfer target, and action type are required" });
    }

    if (toEntityType === "EMPLOYEE" && !toEmployee) {
      return res.status(400).json({ message: "Employee ID is required for employee transfer" });
    }

    if ((toEntityType === "STORE" || toEntityType === "MAINTENANCE_SHOP") && !toStore && !shop) {
      return res.status(400).json({ message: "Shop/Store reference is required for store/maintenance transfer" });
    }

    // Check if asset exists
    const asset = await Asset.findById(assetId);
    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }

    // Check if asset is soft deleted
    if (asset.isDeleted) {
      return res.status(400).json({ message: "Cannot transfer deleted asset" });
    }

    // Validate lifecycle transition
    const transitionValidation = validateTransition(asset.status, actionType);
    if (!transitionValidation.valid) {
      return res.status(400).json({ message: transitionValidation.message });
    }

    // Get current assignment
    const currentAssignment = await Assignment.findOne({
      assetId,
      returnedAt: null
    }).sort({ assignedAt: -1 });

    let fromEntityType = "STORE";
    let fromEmployee = null;
    let fromStore = asset.location;

    if (currentAssignment) {
      fromEntityType = currentAssignment.toEntityType;
      fromEmployee = currentAssignment.toEmployee;
      fromStore = currentAssignment.toStore;
    }

    // If transferring to employee, check if employee exists
    if (toEntityType === "EMPLOYEE") {
      const employee = await Employee.findById(toEmployee);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
    }

    // Determine currentLocation update
    let locationUpdate = {};
    if (toEntityType === "EMPLOYEE") {
      locationUpdate = {
        type: "EMPLOYEE",
        employee: toEmployee,
        shop: null
      };
    } else if (toEntityType === "MAINTENANCE_SHOP") {
      locationUpdate = {
        type: "MAINTENANCE_SHOP",
        employee: null,
        shop: shop || toStore
      };
    } else {
      locationUpdate = {
        type: "STORE",
        employee: null,
        shop: shop || toStore
      };
    }

    // Create new assignment record
    const assignment = await Assignment.create({
      assetId,
      fromEntityType,
      toEntityType,
      fromEmployee,
      fromStore,
      toEmployee: toEntityType === "EMPLOYEE" ? toEmployee : null,
      toStore: toEntityType !== "EMPLOYEE" ? (shop || toStore) : null,
      assignedAt: new Date(),
      remarks: remarks || "",
      actionType,
      shop: shop || null
    });

    // Update asset status and currentLocation
    const newStatus = getNextStatus(actionType);
    
    await Asset.findByIdAndUpdate(assetId, { 
      status: newStatus,
      currentLocation: locationUpdate
    });

    res.status(201).json({
      message: "Asset transferred successfully",
      assignment,
      newStatus
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};


// Return asset to store
export const returnAssetToStore = async (req, res) => {
  try {
    const { assetId, remarks, actionType = "RETURN",toEmployee } = req.body;

    // Validation
    if (!assetId) {
      return res.status(400).json({ message: "Asset ID is required" });
    }

    // Check if asset exists
    const asset = await Asset.findById(assetId);
    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }

    // Check if asset is soft deleted
    if (asset.isDeleted) {
      return res.status(400).json({ message: "Cannot return deleted asset" });
    }

    if (actionType === "RETURN_FROM_MAINTENANCE" && toEmployee) {
      return transferAsset(req, res);
    }

    // Validate lifecycle transition
    const transitionValidation = validateTransition(asset.status, actionType);
    if (!transitionValidation.valid) {
      return res.status(400).json({ message: transitionValidation.message });
    }

    // Get current assignment
    const currentAssignment = await Assignment.findOne({
      assetId,
      returnedAt: null
    }).sort({ assignedAt: -1 });

    if (!currentAssignment) {
      return res.status(400).json({ message: "No active assignment found" });
    }

    // Update assignment with return date and action type
    currentAssignment.returnedAt = new Date();
    currentAssignment.actionType = actionType;
    if (remarks) {
      currentAssignment.remarks = currentAssignment.remarks 
        ? `${currentAssignment.remarks}\nReturn: ${remarks}` 
        : `Return: ${remarks}`;
    }
    await currentAssignment.save();

    // Update asset status and currentLocation
    const newStatus = getNextStatus(actionType);
    await Asset.findByIdAndUpdate(assetId, { 
      status: newStatus,
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

    // Check if asset exists
    const asset = await Asset.findById(id);
    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }

    // Get all assignments for this asset, populated with references
    const assignments = await Assignment.find({ assetId: id })
      .populate('fromEmployee', 'name email')
      .populate('toEmployee', 'name email')
      .populate('shop', 'name code')
      .sort({ assignedAt: -1 });

    
    // Format history entries
    const history = assignments.map(assignment => {
      let fromLocation;
      
      // Special handling for RETURN_FROM_MAINTENANCE
      if (assignment.fromEntityType === 'MAINTENANCE_SHOP') {
  fromLocation = assignment.shop?.name || 'Unknown Shop';
}
       else if (assignment.fromEntityType === 'EMPLOYEE') {
        // Check if fromEmployee is populated (has .name property)
        if (assignment.fromEmployee?.name) {
          fromLocation = assignment.fromEmployee.name;
        } else if (typeof assignment.fromEmployee === 'string') {
          // It's an unpopulated ObjectId, use shop as fallback
          fromLocation = assignment.shop?.name || assignment.fromEmployee;
        } else {
          fromLocation = 'Unknown Employee';
        }
      } else if (assignment.fromEntityType === 'MAINTENANCE_SHOP') {
        fromLocation = assignment.shop?.name || assignment.fromStore || 'Unknown Shop';
      } else {
        fromLocation = assignment.fromStore || 'Store';
      }

      // ✅ ENHANCED: Defensive TO location handling
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
export const getCurrentAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the active assignment for the asset
    const assignment = await Assignment.findOne({
      assetId: id,
      returnedAt: null
    })
    .populate('toEmployee', 'name code')
    .populate('shop', 'name code')
    .populate('toStore', 'name')
    .sort({ assignedAt: -1 });

    if (!assignment) {
      return res.json(null);
    }

    // Return the current assignment data
    const currentAssignment = {
      _id: assignment._id,
      assetId: assignment.assetId,
      toEntityType: assignment.toEntityType,
      toEmployee: assignment.toEmployee,
      toStore: assignment.toStore,
      shop: assignment.shop,
      assignedAt: assignment.assignedAt,
      actionType: assignment.actionType
    };

    res.json(currentAssignment);
  } catch (error) {
    console.error("Get current assignment error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
