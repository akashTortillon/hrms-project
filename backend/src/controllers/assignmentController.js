import Assignment from "../models/assignmentModel.js";
import Asset from "../models/assetModel.js";
import Employee from "../models/employeeModel.js";

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

    // Check if asset is available
    if (asset.status !== "Available") {
      return res.status(400).json({ message: "Asset is not available for assignment" });
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
      remarks: remarks || ""
    });

    // Update asset status to "In Use"
    await Asset.findByIdAndUpdate(assetId, { status: "In Use" });

    res.status(201).json({
      message: "Asset assigned successfully",
      assignment
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Transfer asset
export const transferAsset = async (req, res) => {
  try {
    const { assetId, toEntityType, toEmployee, toStore, remarks } = req.body;

    // Validation
    if (!assetId || !toEntityType) {
      return res.status(400).json({ message: "Asset ID and transfer target are required" });
    }

    if (toEntityType === "EMPLOYEE" && !toEmployee) {
      return res.status(400).json({ message: "Employee ID is required for employee transfer" });
    }

    if (toEntityType === "STORE" && !toStore) {
      return res.status(400).json({ message: "Store name is required for store transfer" });
    }

    // Check if asset exists
    const asset = await Asset.findById(assetId);
    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }

    // Check if asset is in use
    if (asset.status !== "In Use") {
      return res.status(400).json({ message: "Asset must be in use to transfer" });
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

    // Create new assignment record
    const assignment = await Assignment.create({
      assetId,
      fromEntityType,
      toEntityType,
      fromEmployee,
      fromStore,
      toEmployee: toEntityType === "EMPLOYEE" ? toEmployee : null,
      toStore: toEntityType === "STORE" ? toStore : null,
      assignedAt: new Date(),
      remarks: remarks || ""
    });

    // Update asset status based on transfer target
    const newStatus = toEntityType === "EMPLOYEE" ? "In Use" : "Available";
    await Asset.findByIdAndUpdate(assetId, { status: newStatus });

    res.status(201).json({
      message: "Asset transferred successfully",
      assignment
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Return asset to store
export const returnAssetToStore = async (req, res) => {
  try {
    const { assetId, remarks } = req.body;

    // Validation
    if (!assetId) {
      return res.status(400).json({ message: "Asset ID is required" });
    }

    // Check if asset exists
    const asset = await Asset.findById(assetId);
    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }

    // Check if asset is in use
    if (asset.status !== "In Use") {
      return res.status(400).json({ message: "Asset is not currently assigned" });
    }

    // Get current assignment
    const currentAssignment = await Assignment.findOne({
      assetId,
      returnedAt: null
    }).sort({ assignedAt: -1 });

    if (!currentAssignment) {
      return res.status(400).json({ message: "No active assignment found" });
    }

    // Update assignment with return date
    currentAssignment.returnedAt = new Date();
    if (remarks) {
      currentAssignment.remarks = currentAssignment.remarks 
        ? `${currentAssignment.remarks}\nReturn: ${remarks}` 
        : `Return: ${remarks}`;
    }
    await currentAssignment.save();

    // Update asset status to "Available"
    await Asset.findByIdAndUpdate(assetId, { status: "Available" });

    res.json({
      message: "Asset returned successfully",
      assignment: currentAssignment
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
