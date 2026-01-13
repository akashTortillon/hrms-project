import Asset from "../models/assetModel.js";

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

export const createAsset = async (req, res) => {
  try {
    const { name, category, location, subLocation, custodian, department, purchaseCost, purchaseDate, status } = req.body;

    // Validation (assetCode is auto-generated, so not required)
    if (!name || !category || !location || !custodian || !purchaseCost || !purchaseDate) {
      return res.status(400).json({ message: "All required fields must be provided" });
    }

    // Generate asset code automatically
    const assetCode = await generateAssetCode();

    const asset = await Asset.create({
      assetCode,
      name,
      category,
      location,
      subLocation: subLocation || "",
      custodian,
      department: department || "",
      purchaseCost,
      purchaseDate,
      status: status || "Available"
    });

    res.status(201).json({
      message: "Asset created successfully",
      asset
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAssets = async (req, res) => {
  try {
    const assets = await Asset.find().sort({ createdAt: -1 });
    res.json(assets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAssetById = async (req, res) => {
  try {
    const { id } = req.params;
    const asset = await Asset.findById(id);

    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }

    res.json(asset);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateAsset = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedAsset = await Asset.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedAsset) {
      return res.status(404).json({ message: "Asset not found" });
    }

    res.json({
      message: "Asset updated successfully",
      asset: updatedAsset
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteAsset = async (req, res) => {
  try {
    const { id } = req.params;

    const asset = await Asset.findByIdAndUpdate(
      id,
      { isDeleted: true },
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
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
