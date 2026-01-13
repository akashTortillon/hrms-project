import Asset from "../models/assetModel.js";

export const createAsset = async (req, res) => {
  try {
    const { assetCode, name, category, location, custodian, purchaseCost, purchaseDate, status } = req.body;

    // Validation
    if (!assetCode || !name || !category || !location || !custodian || !purchaseCost || !purchaseDate) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if asset code already exists
    const existingAsset = await Asset.findOne({ assetCode });
    if (existingAsset) {
      return res.status(409).json({ message: "Asset code already exists" });
    }

    const asset = await Asset.create({
      assetCode,
      name,
      category,
      location,
      custodian,
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

    const asset = await Asset.findByIdAndDelete(id);

    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }

    res.json({ message: "Asset deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
