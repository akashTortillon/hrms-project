import AssetType from "../models/assetTypeModel.js";
import AssetCategory from "../models/assetCategoryModel.js";
import AssetStatus from "../models/assetStatusModel.js";
import Vendor from "../models/vendorModel.js";
import ServiceType from "../models/serviceTypeModel.js";

// Helper to create handlers
const createHandler = (Model) => ({
    getAll: async (req, res) => {
        try {
            const items = await Model.find().sort({ createdAt: -1 });
            res.status(200).json(items);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },
    create: async (req, res) => {
        try {
            const newItem = new Model(req.body);
            const savedItem = await newItem.save();
            res.status(201).json(savedItem);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    },
    update: async (req, res) => {
        try {
            const updatedItem = await Model.findByIdAndUpdate(
                req.params.id,
                req.body,
                { new: true }
            );
            if (!updatedItem) return res.status(404).json({ message: "Item not found" });
            res.status(200).json(updatedItem);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    },
    delete: async (req, res) => {
        try {
            const deletedItem = await Model.findByIdAndDelete(req.params.id);
            if (!deletedItem) return res.status(404).json({ message: "Item not found" });
            res.status(200).json({ message: "Deleted successfully" });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
});

export const assetTypeController = createHandler(AssetType);
export const assetCategoryController = createHandler(AssetCategory);
export const assetStatusController = createHandler(AssetStatus);
export const vendorController = createHandler(Vendor);
export const serviceTypeController = createHandler(ServiceType);
