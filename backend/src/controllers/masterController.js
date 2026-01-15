import Master from "../models/masterModel.js";

// Mapping frontend "slugs" to db types
const TYPE_MAPPING = {
    // HR
    "departments": "DEPARTMENT",
    "branches": "BRANCH",
    "designations": "DESIGNATION",
    "employee-types": "EMPLOYEE_TYPE",
    "leave-types": "LEAVE_TYPE",
    "document-types": "DOCUMENT_TYPE",
    "nationalities": "NATIONALITY",
    "payroll-rules": "PAYROLL_RULE",
    "workflow-templates": "WORKFLOW_TEMPLATE",

    // Asset
    "asset-types": "ASSET_TYPE",
    "asset-categories": "ASSET_CATEGORY",
    "status-labels": "ASSET_STATUS",
    "vendors": "VENDOR",
    "service-types": "SERVICE_TYPE",
    "roles": "ROLE"
};

export const getItems = async (req, res) => {
    try {
        const { type } = req.params;
        const dbType = TYPE_MAPPING[type] || type.toUpperCase();

        const items = await Master.find({ type: dbType, isActive: true })
            .sort({ name: 1 });

        res.status(200).json(items);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const addItem = async (req, res) => {
    try {
        const { type } = req.params;
        const dbType = TYPE_MAPPING[type] || type.toUpperCase();

        // Handle both simple { name } and complex payloads
        const payload = {
            ...req.body,
            type: dbType
        };

        const newItem = new Master(payload);
        await newItem.save();
        res.status(201).json(newItem);
    } catch (error) {
        // Handle duplicate key error
        if (error.code === 11000) {
            return res.status(400).json({ message: "Item with this name already exists in this list" });
        }
        res.status(500).json({ message: error.message });
    }
};

export const updateItem = async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await Master.findByIdAndUpdate(id, req.body, { new: true });
        if (!updated) return res.status(404).json({ message: "Item not found" });
        res.status(200).json(updated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteItem = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Master.findByIdAndDelete(id);
        if (!deleted) return res.status(404).json({ message: "Item not found" });
        res.status(200).json({ message: "Deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
