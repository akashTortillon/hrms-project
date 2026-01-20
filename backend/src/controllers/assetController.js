// import Asset from "../models/assetModel.js";

// // Generate next asset code (AST001, AST002, etc.)
// const generateAssetCode = async () => {
//   const lastAsset = await Asset.findOne().sort({ assetCode: -1 });
  
//   if (!lastAsset || !lastAsset.assetCode) {
//     return "AST001";
//   }
  
//   const lastNumber = parseInt(lastAsset.assetCode.replace("AST", ""));
//   const nextNumber = lastNumber + 1;
//   return `AST${nextNumber.toString().padStart(3, "0")}`;
// };

// export const createAsset = async (req, res) => {
//   try {
//     const { name, category, location, subLocation, custodian, department, purchaseCost, purchaseDate, status, warrantyPeriod } = req.body;

//     // Validation (assetCode is auto-generated, so not required)
//     if (!name || !category || !location || !custodian || !purchaseCost || !purchaseDate) {
//       return res.status(400).json({ message: "All required fields must be provided" });
//     }

//     // Calculate warranty expiry date if warranty period is provided
//     let warrantyExpiryDate = null;
//     if (warrantyPeriod && warrantyPeriod > 0) {
//       const purchaseDateObj = new Date(purchaseDate);
//       warrantyExpiryDate = new Date(purchaseDateObj);
//       warrantyExpiryDate.setFullYear(purchaseDateObj.getFullYear() + parseInt(warrantyPeriod));
//     }

//     // Generate asset code automatically
//     const assetCode = await generateAssetCode();

//     const asset = await Asset.create({
//       assetCode,
//       name,
//       category,
//       location,
//       subLocation: subLocation || "",
//       custodian,
//       department: department || "",
//       purchaseCost,
//       purchaseDate,
//       warrantyPeriod: warrantyPeriod ? parseInt(warrantyPeriod) : null,
//       warrantyExpiryDate,
//       status: status || "Available",
//       currentLocation: {
//         type: "STORE",
//         employee: null,
//         shop: null
//       }
//     });

//     res.status(201).json({
//       message: "Asset created successfully",
//       asset
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// export const getAssets = async (req, res) => {
//   try {
//     const assets = await Asset.find()
//       .populate('currentLocation.employee', 'name email')
//       .populate('currentLocation.shop', 'name code')
//       .sort({ createdAt: -1 });
//     res.json(assets);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// export const getAssetById = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const asset = await Asset.findById(id)
//       .populate('currentLocation.employee', 'name email')
//       .populate('currentLocation.shop', 'name code');

//     if (!asset) {
//       return res.status(404).json({ message: "Asset not found" });
//     }

//     res.json(asset);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// export const updateAsset = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { warrantyPeriod, purchaseDate, ...otherFields } = req.body;

//     // Calculate warranty expiry date if warranty period or purchase date is updated
//     let warrantyExpiryDate = null;
//     if (warrantyPeriod && warrantyPeriod > 0 && purchaseDate) {
//       const purchaseDateObj = new Date(purchaseDate);
//       warrantyExpiryDate = new Date(purchaseDateObj);
//       warrantyExpiryDate.setFullYear(purchaseDateObj.getFullYear() + parseInt(warrantyPeriod));
//     }

//     const updateData = {
//       ...otherFields,
//       ...(warrantyPeriod && { warrantyPeriod: parseInt(warrantyPeriod) }),
//       ...(warrantyExpiryDate && { warrantyExpiryDate })
//     };

//     const updatedAsset = await Asset.findByIdAndUpdate(
//       id,
//       updateData,
//       { new: true, runValidators: true }
//     );

//     if (!updatedAsset) {
//       return res.status(404).json({ message: "Asset not found" });
//     }

//     res.json({
//       message: "Asset updated successfully",
//       asset: updatedAsset
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// export const deleteAsset = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const asset = await Asset.findByIdAndUpdate(
//       id,
//       { isDeleted: true,
//         status: "Disposed"
//        },
       
//       { new: true }
//     );

//     if (!asset) {
//       return res.status(404).json({ message: "Asset not found" });
//     }

//     res.json({ 
//       message: "Asset deleted successfully",
//       asset 
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Server error" });
//   }
// };






import Asset from "../models/assetModel.js";
import Employee from "../models/employeeModel.js";
import fs from "fs";
import path from "path";
import XLSX from "xlsx";

// Generate next asset code (AST001, AST002, etc.)
const generateAssetCode = async () => {
  const lastAsset = await Asset.findOne().sort({ assetCode: -1 });
  
  if (!lastAsset || !lastAsset.assetCode) {
    return "AST001";
  }
  
  const lastNumber = parseInt(lastAsset.assetCode.replace("AST", ""));
  const nextNumber = lastNumber + 1;
  return `AST${nextNumber.toString().padStart(3, "0")}`;
};

// ✅ CREATE ASSET
export const createAsset = async (req, res) => {
  try {
    const { 
      name, 
      serialNumber,
      type,
      category, 
      location, 
      subLocation, 
      custodian, 
      department, 
      purchaseCost, 
      purchaseDate, 
      status, 
      warrantyPeriod,
      serviceDueDate 
    } = req.body;

    // Validation
    if (!name || !type || !category || !location || !purchaseCost || !purchaseDate) {
      return res.status(400).json({ message: "All required fields must be provided" });
    }

    // Validate custodian if provided
    if (custodian) {
      const employee = await Employee.findById(custodian);
      if (!employee) {
        return res.status(404).json({ message: "Custodian employee not found" });
      }
    }

    // Calculate warranty expiry date if warranty period is provided
    let warrantyExpiryDate = null;
    if (warrantyPeriod && warrantyPeriod > 0) {
      const purchaseDateObj = new Date(purchaseDate);
      warrantyExpiryDate = new Date(purchaseDateObj);
      warrantyExpiryDate.setFullYear(purchaseDateObj.getFullYear() + parseInt(warrantyPeriod));
    }

    // Generate asset code automatically
    const assetCode = await generateAssetCode();

    const asset = await Asset.create({
      assetCode,
      name,
      serialNumber: serialNumber || "",
      type,
      category,
      location,
      subLocation: subLocation || "",
      custodian: custodian || null,
      department: department || "",
      purchaseCost,
      purchaseDate,
      warrantyPeriod: warrantyPeriod ? parseInt(warrantyPeriod) : null,
      warrantyExpiryDate,
      serviceDueDate: serviceDueDate || null,
      status: status || "Available",
      currentLocation: {
        type: custodian ? "EMPLOYEE" : "STORE",
        employee: custodian || null,
        shop: null
      }
    });

    const populatedAsset = await Asset.findById(asset._id).populate('custodian', 'name code email');

    res.status(201).json({
      message: "Asset created successfully",
      asset: populatedAsset
    });
  } catch (error) {
    console.error("Create asset error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// GET ALL ASSETS
// export const getAssets = async (req, res) => {
//   try {
//     const assets = await Asset.find()
//       .populate({ path: 'custodian', select: 'name code email department' })
//       .populate({ path: 'currentLocation.employee', select: 'name email code' })
//       .populate({ path: 'currentLocation.shop', select: 'name code' })
//       .sort({ createdAt: -1 });
//     res.json(assets);
//   } catch (error) {
//     console.error("Get assets error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };




export const getAssets = async (req, res) => {
  try {
    const { search, type, status } = req.query;

    // Base filter (exclude deleted assets)
    const filter = {
      isDeleted: false
    };

    // Filter by asset type
    if (type && type !== "ALL") {
      filter.type = type;
    }

    // Filter by asset status
    if (status && status !== "ALL") {
      filter.status = status;
    }

    // Search (case-insensitive, partial match)
    if (search && search.trim()) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { assetCode: { $regex: search, $options: "i" } },
        { serialNumber: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } }
      ];
    }

    const assets = await Asset.find(filter)
      .populate({ path: "custodian", select: "name code email department" })
      .populate({ path: "currentLocation.employee", select: "name email code" })
      .populate({ path: "currentLocation.shop", select: "name code" })
      .sort({ createdAt: -1 });

    // IMPORTANT: Return plain array (matches existing frontend expectations)
    res.status(200).json(assets);
  } catch (error) {
    console.error("Get assets error:", error);
    res.status(500).json({ message: "Server error" });
  }
};





// GET ASSET BY ID
export const getAssetById = async (req, res) => {
  try {
    const { id } = req.params;
    const asset = await Asset.findById(id)
      .populate({ path: 'custodian', select: 'name code email department' })
      .populate({ path: 'currentLocation.employee', select: 'name email code' })
      .populate({ path: 'currentLocation.shop', select: 'name code' })
      .populate({ path: 'maintenanceLogs.performedBy', select: 'name' })
      .populate({ path: 'documents.uploadedBy', select: 'name' });

    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }

    res.json(asset);
  } catch (error) {
    console.error("Get asset by ID error:", error);
    res.status(500).json({ message: "Server error" });
  }
};





// ✅ UPDATE ASSET
export const updateAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const { warrantyPeriod, purchaseDate, custodian, ...otherFields } = req.body;

    // Validate custodian if provided
    if (custodian) {
      const employee = await Employee.findById(custodian);
      if (!employee) {
        return res.status(404).json({ message: "Custodian employee not found" });
      }
    }

    // Calculate warranty expiry date if warranty period or purchase date is updated
    let warrantyExpiryDate = null;
    if (warrantyPeriod && warrantyPeriod > 0 && purchaseDate) {
      const purchaseDateObj = new Date(purchaseDate);
      warrantyExpiryDate = new Date(purchaseDateObj);
      warrantyExpiryDate.setFullYear(purchaseDateObj.getFullYear() + parseInt(warrantyPeriod));
    }

    const updateData = {
      ...otherFields,
      ...(purchaseDate && { purchaseDate }),
      ...(custodian !== undefined && { custodian: custodian || null }),
      ...(warrantyPeriod && { warrantyPeriod: parseInt(warrantyPeriod) }),
      ...(warrantyExpiryDate && { warrantyExpiryDate })
    };

    const updatedAsset = await Asset.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('custodian', 'name code email department');

    if (!updatedAsset) {
      return res.status(404).json({ message: "Asset not found" });
    }

    res.json({
      message: "Asset updated successfully",
      asset: updatedAsset
    });
  } catch (error) {
    console.error("Update asset error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ DELETE ASSET (SOFT DELETE)
export const deleteAsset = async (req, res) => {
  try {
    const { id } = req.params;

    const asset = await Asset.findByIdAndUpdate(
      id,
      { 
        isDeleted: true,
        status: "Disposed"
      },
      { new: true }
    );

    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }

    res.json({ 
      message: "Asset deleted successfully",
      asset 
    });
  } catch (error) {
    console.error("Delete asset error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// // ✅ SCHEDULE MAINTENANCE
// export const scheduleMaintenance = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { scheduledDate, serviceType, provider, cost, description } = req.body;

//     if (!scheduledDate || !serviceType || !provider) {
//       return res.status(400).json({ 
//         message: "Scheduled date, service type, and provider are required" 
//       });
//     }

//     const asset = await Asset.findById(id);
//     if (!asset) {
//       return res.status(404).json({ message: "Asset not found" });
//     }

//     const maintenanceLog = {
//       scheduledDate: new Date(scheduledDate),
//       serviceType,
//       provider,
//       cost: cost || 0,
//       description: description || "",
//       status: "Scheduled",
//       performedBy: req.user.id
//     };

//     asset.maintenanceLogs.push(maintenanceLog);
//     await asset.save();

//     const updatedAsset = await Asset.findById(id)
//       .populate('maintenanceLogs.performedBy', 'name');

//     res.status(201).json({
//       message: "Maintenance scheduled successfully",
//       asset: updatedAsset
//     });
//   } catch (error) {
//     console.error("Schedule maintenance error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// // ✅ UPDATE MAINTENANCE LOG
// export const updateMaintenanceLog = async (req, res) => {
//   try {
//     const { id, maintenanceId } = req.params;
//     const { completedDate, status, cost, description } = req.body;

//     const asset = await Asset.findById(id);
//     if (!asset) {
//       return res.status(404).json({ message: "Asset not found" });
//     }

//     const maintenanceLog = asset.maintenanceLogs.id(maintenanceId);
//     if (!maintenanceLog) {
//       return res.status(404).json({ message: "Maintenance log not found" });
//     }

//     if (completedDate) maintenanceLog.completedDate = new Date(completedDate);
//     if (status) maintenanceLog.status = status;
//     if (cost !== undefined) maintenanceLog.cost = cost;
//     if (description) maintenanceLog.description = description;

//     await asset.save();

//     const updatedAsset = await Asset.findById(id)
//       .populate('maintenanceLogs.performedBy', 'name');

//     res.json({
//       message: "Maintenance log updated successfully",
//       asset: updatedAsset
//     });
//   } catch (error) {
//     console.error("Update maintenance log error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// // ✅ DELETE MAINTENANCE LOG
// export const deleteMaintenanceLog = async (req, res) => {
//   try {
//     const { id, maintenanceId } = req.params;

//     const asset = await Asset.findById(id);
//     if (!asset) {
//       return res.status(404).json({ message: "Asset not found" });
//     }

//     asset.maintenanceLogs.pull(maintenanceId);
//     await asset.save();

//     res.json({
//       message: "Maintenance log deleted successfully"
//     });
//   } catch (error) {
//     console.error("Delete maintenance log error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };




///////////////////////////////////////////////////////////////

export const scheduleMaintenance = async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduledDate, serviceType, provider, cost, description } = req.body;

    if (!scheduledDate || !serviceType || !provider) {
      return res.status(400).json({ 
        message: "Scheduled date, service type, and provider are required" 
      });
    }

    const asset = await Asset.findById(id);
    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }

    const maintenanceLog = {
      scheduledDate: new Date(scheduledDate),
      serviceType,
      provider,
      cost: cost || 0,
      description: description || "",
      status: "Scheduled",
      performedBy: req.user.id
    };

    asset.maintenanceLogs.push(maintenanceLog);
    await asset.save();

    const updatedAsset = await Asset.findById(id)
      .populate('maintenanceLogs.performedBy', 'name');

    res.status(201).json({
      message: "Maintenance scheduled successfully",
      asset: updatedAsset
    });
  } catch (error) {
    console.error("Schedule maintenance error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ UPDATE MAINTENANCE LOG
export const updateMaintenanceLog = async (req, res) => {
  try {
    const { id, maintenanceId } = req.params;
    const { completedDate, status, cost, description } = req.body;

    const asset = await Asset.findById(id);
    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }

    const maintenanceLog = asset.maintenanceLogs.id(maintenanceId);
    if (!maintenanceLog) {
      return res.status(404).json({ message: "Maintenance log not found" });
    }

    if (completedDate) maintenanceLog.completedDate = new Date(completedDate);
    if (status) maintenanceLog.status = status;
    if (cost !== undefined) maintenanceLog.cost = cost;
    if (description) maintenanceLog.description = description;

    // 🔥 FIX: Close active maintenance assignment if status is Completed or Cancelled
    if (status === "Completed" || status === "Cancelled") {
      await Assignment.findOneAndUpdate(
        {
          assetId: asset._id,
          actionType: "TRANSFER_TO_MAINTENANCE",
          returnedAt: null
        },
        {
          returnedAt: new Date()
        }
      );
    }

    await asset.save();

    const updatedAsset = await Asset.findById(id)
      .populate('maintenanceLogs.performedBy', 'name');

    res.json({
      message: "Maintenance log updated successfully",
      asset: updatedAsset
    });
  } catch (error) {
    console.error("Update maintenance log error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ DELETE MAINTENANCE LOG
export const deleteMaintenanceLog = async (req, res) => {
  try {
    const { id, maintenanceId } = req.params;

    const asset = await Asset.findById(id);
    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }

    asset.maintenanceLogs.pull(maintenanceId);
    await asset.save();

    res.json({
      message: "Maintenance log deleted successfully"
    });
  } catch (error) {
    console.error("Delete maintenance log error:", error);
    res.status(500).json({ message: "Server error" });
  }
};



// EXPORT assets (Excel)
// export const exportAssets = async (req, res) => {
//   try {
//     const { department, status, search, category, location } = req.query;
//     let matchStage = {};
//     // Filter by Department
//     if (department && department !== "All Departments") {
//       matchStage.department = department;
//     }
//     // Filter by Status
//     if (status && status !== "All Status") {
//       matchStage.status = status;
//     }
//     // Filter by Category
//     if (category && category !== "All Categories") {
//       matchStage.category = category;
//     }
//     // Filter by Location
//     if (location && location !== "All Locations") {
//       matchStage.location = location;
//     }
//     // Filter by Search (Name, Code, Serial Number)
//     if (search) {
//       matchStage.$or = [
//         { name: { $regex: search, $options: "i" } },
//         { assetCode: { $regex: search, $options: "i" } },
//         { serialNumber: { $regex: search, $options: "i" } }
//       ];
//     }
//     const assets = await Asset.aggregate([
//       { $match: matchStage },
//       { $sort: { assetCode: 1 } },
//       {
//         $project: {
//           _id: 0,
//           "Asset ID": "$assetCode",
//           "Asset Name": "$name",
//           "Category": "$category",
//           "Status": "$status",
//           "Location": "$currentLocation.type",
//           "Custodian": {
//             $concat: [
//               { $cond: [{ $eq: ["$custodian.type", "EMPLOYEE"] }, 
//                         { $then: "$custodian.employee.name" }, 
//                         { $else: { $cond: [{ $eq: ["$custodian.type", "DEPARTMENT"] }, 
//                                           { $then: "$custodian.department" }, 
//                                           { $else: "N/A" }] }
//               }
//             ]
//           },
//           "Purchase Date": {
//             $dateToString: { format: "%Y-%m-%d", date: "$purchaseDate" }
//           },
//           "Warranty Expiry": {
//             $dateToString: { format: "%Y-%m-%d", date: "$warrantyExpiryDate" }
//           },
//           "Value": "$purchaseValue"
//         }
//       }
//     ]);
//     const worksheet = XLSX.utils.json_to_sheet(assets);
    
//     // Auto-width columns
//     const maxWidth = assets.reduce((w, r) => Math.max(w, r["Asset Name"] ? r["Asset Name"].length : 15), 15);
//     worksheet["!cols"] = [
//       { wch: 15 },  // Asset ID
//       { wch: 25 },  // Asset Name
//       { wch: 20 },  // Category
//       { wch: 15 },  // Status
//       { wch: 15 },  // Location
//       { wch: 30 },  // Custodian
//       { wch: 15 },  // Purchase Date
//       { wch: 15 },  // Warranty Expiry
//       { wch: 12 }   // Value
//     ];
//     const workbook = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(workbook, worksheet, "Assets");
//     const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
//     res.setHeader("Content-Disposition", 'attachment; filename="Assets.xlsx"');
//     res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
//     res.send(buffer);
//   } catch (error) {
//     console.error("Export Error:", error);
//     res.status(500).json({ message: "Export failed" });
//   }
// };




export const exportAssets = async (req, res) => {
  try {
    const { department, status, search, category, location } = req.query;
    let matchStage = {};

    // Filters
    if (department && department !== "All Departments") matchStage.department = department;
    if (status && status !== "All Status") matchStage.status = status;
    if (category && category !== "All Categories") matchStage.category = category;
    if (location && location !== "All Locations") matchStage.location = location;
    if (search) {
      matchStage.$or = [
        { name: { $regex: search, $options: "i" } },
        { assetCode: { $regex: search, $options: "i" } },
        { serialNumber: { $regex: search, $options: "i" } }
      ];
    }

    const assets = await Asset.aggregate([
      { $match: matchStage },
      { $sort: { assetCode: 1 } },
      {
        $project: {
          _id: 0,
          "Asset ID": "$assetCode",
          "Asset Name": "$name",
          "Category": "$category",
          "Status": "$status",
          "Location": "$currentLocation.type",
          "Custodian": {
            $cond: [
              { $eq: ["$custodian.type", "EMPLOYEE"] },
              { $ifNull: ["$custodian.employee.name", "N/A"] },
              {
                $cond: [
                  { $eq: ["$custodian.type", "DEPARTMENT"] },
                  { $ifNull: ["$custodian.department", "N/A"] },
                  "N/A"
                ]
              }
            ]
          },
          "Purchase Date": {
            $dateToString: { format: "%Y-%m-%d", date: "$purchaseDate" }
          },
          "Warranty Expiry": {
            $dateToString: { format: "%Y-%m-%d", date: "$warrantyExpiryDate" }
          },
          "Value": "$purchaseCost" // <-- you had $purchaseValue, changed to match Asset.js
        }
      }
    ]);

    // Convert to worksheet
    const worksheet = XLSX.utils.json_to_sheet(assets);

    // Auto-width columns
    worksheet["!cols"] = [
      { wch: 15 },  // Asset ID
      { wch: 25 },  // Asset Name
      { wch: 20 },  // Category
      { wch: 15 },  // Status
      { wch: 15 },  // Location
      { wch: 30 },  // Custodian
      { wch: 15 },  // Purchase Date
      { wch: 15 },  // Warranty Expiry
      { wch: 12 }   // Value
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Assets");
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

    res.setHeader("Content-Disposition", 'attachment; filename="Assets.xlsx"');
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  } catch (error) {
    console.error("Export Error:", error);
    res.status(500).json({ message: "Export failed", error: error.message });
  }
};








/////////////////////////////////////////////////////////////////








// ✅ ADD/UPDATE AMC DETAILS
export const updateAmcDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const { provider, contractNumber, startDate, endDate, cost, coverageDetails, status } = req.body;

    if (!provider || !startDate || !endDate) {
      return res.status(400).json({ 
        message: "Provider, start date, and end date are required" 
      });
    }

    const asset = await Asset.findById(id);
    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }

    asset.amcDetails = {
      provider,
      contractNumber: contractNumber || "",
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      cost: cost || 0,
      coverageDetails: coverageDetails || "",
      status: status || "Active"
    };

    await asset.save();

    res.json({
      message: "AMC details updated successfully",
      asset
    });
  } catch (error) {
    console.error("Update AMC details error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ UPLOAD DOCUMENT
export const uploadDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "Document file is required" });
    }

    if (!type) {
      return res.status(400).json({ message: "Document type is required" });
    }

    const asset = await Asset.findById(id);
    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }

    const document = {
      type,
      fileName: req.file.originalname,
      filePath: req.file.path,
      uploadedBy: req.user.id,
      uploadedAt: new Date()
    };

    asset.documents.push(document);
    await asset.save();

    const updatedAsset = await Asset.findById(id)
      .populate('documents.uploadedBy', 'name');

    res.status(201).json({
      message: "Document uploaded successfully",
      asset: updatedAsset
    });
  } catch (error) {
    console.error("Upload document error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ DELETE DOCUMENT
export const deleteDocument = async (req, res) => {
  try {
    const { id, documentId } = req.params;

    const asset = await Asset.findById(id);
    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }

    const document = asset.documents.id(documentId);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    // Delete file from filesystem
    if (fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }

    asset.documents.pull(documentId);
    await asset.save();

    res.json({
      message: "Document deleted successfully"
    });
  } catch (error) {
    console.error("Delete document error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ DOWNLOAD DOCUMENT
export const downloadDocument = async (req, res) => {
  try {
    const { id, documentId } = req.params;

    const asset = await Asset.findById(id);
    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }

    const document = asset.documents.id(documentId);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    if (!fs.existsSync(document.filePath)) {
      return res.status(404).json({ message: "Document file not found on server" });
    }

    res.download(document.filePath, document.fileName);
  } catch (error) {
    console.error("Download document error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ DISPOSE ASSET
export const disposeAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const { disposalDate, disposalMethod, disposalReason, disposalValue, remarks, disposalDocument } = req.body;

    if (!disposalDate || !disposalMethod || !disposalReason) {
      return res.status(400).json({ 
        message: "Disposal date, method, and reason are required" 
      });
    }

    const asset = await Asset.findById(id);
    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }

    if (asset.status === "Disposed") {
      return res.status(400).json({ message: "Asset is already disposed" });
    }

    asset.disposalDetails = {
      disposalDate: new Date(disposalDate),
      disposalMethod,
      disposalReason,
      disposalValue: disposalValue || 0,
      disposedBy: req.user.id,
      remarks: remarks || "",
      disposalDocument: disposalDocument || ""
    };

    asset.status = "Disposed";
    asset.isDeleted = true;

    await asset.save();

    const updatedAsset = await Asset.findById(id)
      .populate({ path: 'disposalDetails.disposedBy', select: 'name' });

    res.json({
      message: "Asset disposed successfully",
      asset: updatedAsset
    });
  } catch (error) {
    console.error("Dispose asset error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ GET ALERTS (WARRANTY & SERVICE DUE)
export const getAssetAlerts = async (req, res) => {
  try {
    const today = new Date();
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    // Warranty expiring soon
    const warrantyAlerts = await Asset.find({
      isDeleted: false,
      status: { $ne: "Disposed" },
      warrantyExpiryDate: {
        $gte: today,
        $lte: thirtyDaysFromNow
      }
    }).populate({ path: 'custodian', select: 'name code' });

    // Service due soon
    const serviceAlerts = await Asset.find({
      isDeleted: false,
      status: { $ne: "Disposed" },
      serviceDueDate: {
        $gte: today,
        $lte: thirtyDaysFromNow
      }
    }).populate({ path: 'custodian', select: 'name code' });

    // AMC expiring soon
    const amcAlerts = await Asset.find({
      isDeleted: false,
      status: { $ne: "Disposed" },
      "amcDetails.endDate": {
        $gte: today,
        $lte: thirtyDaysFromNow
      }
    }).populate({ path: 'custodian', select: 'name code' });

    res.json({
      warrantyAlerts,
      serviceAlerts,
      amcAlerts,
      totalAlerts: warrantyAlerts.length + serviceAlerts.length + amcAlerts.length
    });
  } catch (error) {
    console.error("Get asset alerts error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ GET EMPLOYEE'S ASSETS
export const getEmployeeAssets = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const assets = await Asset.find({
      custodian: employeeId,
      isDeleted: false
    }).populate({ path: 'currentLocation.shop', select: 'name code' });

    res.json(assets);
  } catch (error) {
    console.error("Get employee assets error:", error);
    res.status(500).json({ message: "Server error" });
  }
};