import Workflow from "../models/workflowModel.js";
import path from "path";
import fs from "fs";

// Preset Checklist Items
const ONBOARDING_ITEMS = [
    { name: "Join Form", description: "Complete the joining form", required: true },
    { name: "Employee Info Form", description: "Personal details form", required: true },
    { name: "Passport Keeping Form", description: "Consent for passport retention", required: true },
    { name: "Visa Copy", description: "Upload Visa Copy", required: true },
    { name: "Passport", description: "Upload Passport Copy", required: true },
    { name: "Photo", description: "Upload Passport Size Photo", required: true },
    { name: "Voucher Form", description: "Voucher acceptance form", required: true },
    { name: "Training Form", description: "Initial training completion", required: true }
];

const OFFBOARDING_ITEMS = [
    { name: "Resignation Letter", description: "Upload signed resignation", required: true },
    { name: "Asset Handover", description: "Return all assigned assets", required: true },
    { name: "Exit Interview", description: "Complete exit interview form", required: true },
    { name: "Visa Cancellation", description: "Visa cancellation paper", required: true },
    { name: "Final Settlement", description: "Signed final settlement", required: true }
];

// Get or Create Workflow
export const getEmployeeWorkflow = async (req, res) => {
    try {
        const { employeeId, type } = req.params;

        let workflow = await Workflow.findOne({ employee: employeeId, type });

        const defaultItems = type === 'Onboarding' ? ONBOARDING_ITEMS : OFFBOARDING_ITEMS;

        if (!workflow) {
            // Auto-create if not exists (Lazy initialization)
            workflow = await Workflow.create({
                employee: employeeId,
                type,
                items: defaultItems,
                createdBy: req.user._id
            });
        } else if (!workflow.items || workflow.items.length === 0) {
            // Populate if exists but empty (Self-healing)
            workflow.items = defaultItems;
            await workflow.save();
        }

        res.json({ success: true, data: workflow });
    } catch (error) {
        console.error("Workflow Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Add Manual Item
export const addItemToWorkflow = async (req, res) => {
    try {
        const { workflowId } = req.params;
        const { name } = req.body;

        if (!name) return res.status(400).json({ message: "Item name is required" });

        const workflow = await Workflow.findById(workflowId);
        if (!workflow) return res.status(404).json({ message: "Workflow not found" });

        workflow.items.push({
            name,
            description: "Custom item",
            required: true,
            status: "Pending"
        });

        await workflow.save();
        res.json({ success: true, data: workflow });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update Item (Status / File)
export const updateWorkflowItem = async (req, res) => {
    try {
        const { workflowId, itemId } = req.params;
        const file = req.file; // From multer

        const workflow = await Workflow.findById(workflowId);
        if (!workflow) return res.status(404).json({ message: "Workflow not found" });

        const item = workflow.items.id(itemId);
        if (!item) return res.status(404).json({ message: "Item not found" });

        // Handle File Upload
        if (file) {
            item.documentUrl = `/uploads/workflows/${file.filename}`;
            item.status = "Completed"; // Auto-complete on upload logic? User preference: Maybe yes for now.
        }

        // Handle Status Update from Body (if manual toggle)
        if (req.body.status) {
            item.status = req.body.status;
        }

        item.updatedBy = req.user._id;
        item.updatedAt = new Date();

        // Check if all items completed
        const allCompleted = workflow.items.every(i => i.status === "Completed");
        if (allCompleted) {
            workflow.status = "Completed";
            workflow.completedAt = new Date();
        } else {
            workflow.status = "In Progress";
        }

        await workflow.save();
        res.json({ success: true, data: workflow });

    } catch (error) {
        console.error("Update Item Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Initiate Manually (Optional, if we want to reset or force create)
export const initiateWorkflow = async (req, res) => {
    // Logic similar to getEmployeeWorkflow lazy init...
    // Only Admin can do this explicitly if needed.
    // For now, getEmployeeWorkflow handles it.
    res.json({ message: "Use GET endpoint to lazy-init" });
};
