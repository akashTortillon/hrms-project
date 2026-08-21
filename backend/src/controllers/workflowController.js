import Workflow from "../models/workflowModel.js";
import Master from "../models/masterModel.js";
import Employee from "../models/employeeModel.js";
import path from "path";
import fs from "fs";
import { getSignedFileUrl } from "../utils/storage.js";

// Items uploaded before documentPath existed only have the raw (unsigned) S3 URL -
// the key is still recoverable from its path, so old uploads don't stay broken forever.
const deriveS3KeyFromUrl = (url) => {
    try {
        return decodeURIComponent(new URL(url).pathname.replace(/^\/+/, ""));
    } catch {
        return null;
    }
};

const signWorkflowItemDocuments = async (workflow) => {
    if (!workflow?.items?.length) return workflow;
    const plain = workflow.toObject ? workflow.toObject() : workflow;
    await Promise.all(
        plain.items.map(async (item) => {
            if (!item.documentUrl) return;
            try {
                item.documentUrl = await getSignedFileUrl({
                    filePath: item.documentPath || deriveS3KeyFromUrl(item.documentUrl),
                    fileUrl: item.documentUrl,
                    storage: item.documentStorage || "S3"
                });
            } catch (err) {
                console.error("Failed to sign workflow document URL:", err.message);
            }
        })
    );
    return plain;
};

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
    { name: "Job Handover", description: "Complete job handover checklist", required: true },
    { name: "Exit Interview", description: "Complete exit interview form", required: true },
    { name: "Loan Settlement", description: "Close pending loans and deductions", required: true },
    { name: "Final Settlement", description: "Signed final settlement", required: true },
    { name: "Visa Cancellation", description: "Visa cancellation paper", required: true }
];

const mergeTemplateSteps = (defaultItems = [], templateItems = []) => {
    if (templateItems.length > 0) {
        // The template is the source of truth once an admin has saved it - a step
        // missing here means it was intentionally removed, not something to restore.
        // Hardcoded defaults are only used to enrich a matching-by-name item (fill in
        // description/required for legacy entries), never to reintroduce a removed one.
        const defaultsByName = new Map(defaultItems.map((item) => [item.name, item]));
        return templateItems
            .filter((item) => item?.name)
            .map((item) => {
                const base = defaultsByName.get(item.name);
                return base
                    ? { ...base, ...item, name: base.name, required: base.required }
                    : { ...item, status: item.status || "Pending" };
            });
    }
    // No template exists yet - seed from the hardcoded defaults.
    return defaultItems.map((item) => ({ ...item }));
};

const normalizeWorkflowItems = (existingItems = [], templateItems = []) => {
    const existingByName = new Map(existingItems.map((item) => [item.name, item]));
    const normalized = [];

    templateItems.forEach((templateItem) => {
        const existing = existingByName.get(templateItem.name);
        if (existing) {
            normalized.push({
                ...existing.toObject?.() || existing,
                name: templateItem.name,
                description: templateItem.description,
                required: templateItem.required
            });
            existingByName.delete(templateItem.name);
        } else {
            normalized.push({
                ...templateItem,
                status: "Pending"
            });
        }
    });

    existingByName.forEach((item) => {
        const plain = item.toObject?.() || item;
        // A leftover item is no longer in the (now-authoritative) template. Only keep
        // it if real work exists on it - anything not "Pending". A step still
        // untouched simply disappears along with its template removal; a Completed
        // step (has an uploaded document) is preserved so a template edit can never
        // destroy a real employee submission.
        if (plain.status && plain.status !== "Pending") {
            normalized.push(plain);
        }
    });

    return normalized;
};

// Auto-creates an Onboarding checklist Workflow for a freshly-added employee, reusing the
// same default-items/template-merge logic as the manual get-or-create below (getEmployeeWorkflow)
// so a new hire's checklist is populated immediately instead of only appearing once HR
// separately opens the Onboarding page. Called from employeeController.js's addEmployee
// when the employee is created with status "Onboarding" - never overwrites an existing
// workflow (defensive no-op if one somehow already exists for this employee).
export const createOnboardingWorkflowForEmployee = async (employeeId, createdBy) => {
    const type = "Onboarding";
    const existing = await Workflow.findOne({ employee: employeeId, type });
    if (existing) return existing;

    // Case-insensitive: the Masters admin UI lets an admin free-type the template name
    // (e.g. "OFFBOARDING"), while this hardcoded `type` is always proper-case
    // ("Onboarding"/"Offboarding"). An exact-match query silently misses that admin's
    // template and auto-creates a second, divergent one - so an admin's edits (saved
    // correctly to their own template) never reach what employees actually see.
    let template = await Master.findOne({
        type: "WORKFLOW_TEMPLATE",
        name: { $regex: new RegExp(`^${type}$`, "i") }
    });
    const initialItems = template?.metadata?.steps?.length
        ? mergeTemplateSteps(ONBOARDING_ITEMS, template.metadata.steps)
        : ONBOARDING_ITEMS;

    if (!template && initialItems.length > 0) {
        try {
            template = await Master.create({
                type: "WORKFLOW_TEMPLATE",
                name: type,
                metadata: { steps: initialItems },
                isActive: true
            });
        } catch (err) {
            console.warn("Auto-create master template failed (likely race condition):", err.message);
        }
    }

    return Workflow.create({ employee: employeeId, type, items: initialItems, createdBy });
};

// Get or Create Workflow
export const getEmployeeWorkflow = async (req, res) => {
    try {
        const { employeeId, type } = req.params;

        let workflow = await Workflow.findOne({ employee: employeeId, type });
        const defaultItems = type === 'Onboarding' ? ONBOARDING_ITEMS : OFFBOARDING_ITEMS;
        // Same case-insensitive match as createOnboardingWorkflowForEmployee above -
        // see comment there for why this must not be an exact-case match.
        let template = await Master.findOne({
            type: "WORKFLOW_TEMPLATE",
            name: { $regex: new RegExp(`^${type}$`, "i") }
        });
        let initialItems = [];

        if (template?.metadata?.steps?.length) {
            initialItems = mergeTemplateSteps(defaultItems, template.metadata.steps);
        } else {
            initialItems = defaultItems;

            if (initialItems.length > 0) {
                try {
                    const newTemplate = await Master.create({
                        type: "WORKFLOW_TEMPLATE",
                        name: type,
                        metadata: { steps: initialItems },
                        isActive: true
                    });
                    console.log(`Auto-created Master Template for ${type}`);
                    template = newTemplate;
                } catch (err) {
                    console.warn("Auto-create master template failed (likely race condition):", err.message);
                }
            }
        }

        if (!workflow) {
            // Auto-create Workflow Instance
            workflow = await Workflow.create({
                employee: employeeId,
                type,
                items: initialItems,
                createdBy: req.user._id
            });
        } else {
            const reconciledItems = normalizeWorkflowItems(workflow.items, initialItems);
            const hasChanged =
                reconciledItems.length !== workflow.items.length ||
                reconciledItems.some((item, index) => {
                    const current = workflow.items[index];
                    return !current
                        || current.name !== item.name
                        || current.description !== item.description
                        || Boolean(current.required) !== Boolean(item.required);
                });

            if (hasChanged) {
                workflow.items = reconciledItems;
                await workflow.save();
            }
        }

        res.json({ success: true, data: await signWorkflowItemDocuments(workflow) });
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

        if (workflow.type === "Offboarding") {
            const currentIndex = workflow.items.findIndex(i => i._id.toString() === itemId);
            const previousRequiredPending = workflow.items
                .slice(0, currentIndex)
                .some(i => i.required && i.status !== "Completed");

            if (previousRequiredPending) {
                return res.status(400).json({ message: "Complete previous offboarding steps first" });
            }
        }

        // Handle File Upload
        if (file) {
            // `file.filename` only exists for multer.diskStorage - this route's
            // upload middleware uses multerS3, whose req.file instead sets
            // `location` (the full public S3 URL) and `key`. Using `.filename`
            // here always produced "/uploads/workflows/undefined" - the file
            // landed in S3 fine, but nothing ever pointed at it.
            // The bucket is private, so `location` alone 403s when opened directly -
            // keep the S3 key too so getEmployeeWorkflow can sign it on read.
            item.documentUrl = file.location;
            item.documentPath = file.key;
            item.documentStorage = "S3";
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

            // AUTOMATION: Update Employee Status based on Workflow Type
            if (workflow.type === 'Offboarding') {
                await Employee.findByIdAndUpdate(workflow.employee, { status: 'Inactive' });
            } else if (workflow.type === 'Onboarding') {
                await Employee.findByIdAndUpdate(workflow.employee, { status: 'Active' });
            }
        } else {
            workflow.status = "In Progress";
        }

        await workflow.save();
        res.json({ success: true, data: await signWorkflowItemDocuments(workflow) });

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
