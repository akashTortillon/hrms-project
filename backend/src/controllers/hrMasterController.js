import EmployeeType from "../models/employeeTypeModel.js";
import LeaveType from "../models/leaveTypeModel.js";
import DocumentType from "../models/documentTypeModel.js";
import Nationality from "../models/nationalityModel.js";
import PayrollRule from "../models/payrollRuleModel.js";
import WorkflowTemplate from "../models/workflowTemplateModel.js";

// Generic Helper for CRUD
const createHandler = (Model, name) => ({
    getAll: async (req, res) => {
        try {
            const items = await Model.find().sort({ createdAt: -1 });
            res.status(200).json(items);
        } catch (error) {
            res.status(500).json({ message: `Error fetching ${name}s`, error: error.message });
        }
    },
    add: async (req, res) => {
        try {
            const { name, status } = req.body;
            const existing = await Model.findOne({ name });
            if (existing) return res.status(400).json({ message: `${name} already exists` });

            const newItem = new Model({ name, status });
            await newItem.save();
            res.status(201).json(newItem);
        } catch (error) {
            res.status(500).json({ message: `Error adding ${name}`, error: error.message });
        }
    },
    update: async (req, res) => {
        try {
            const { id } = req.params;
            const { name, status } = req.body;
            const updated = await Model.findByIdAndUpdate(id, { name, status }, { new: true });
            if (!updated) return res.status(404).json({ message: `${name} not found` });
            res.status(200).json(updated);
        } catch (error) {
            res.status(500).json({ message: `Error updating ${name}`, error: error.message });
        }
    },
    delete: async (req, res) => {
        try {
            const { id } = req.params;
            const deleted = await Model.findByIdAndDelete(id);
            if (!deleted) return res.status(404).json({ message: `${name} not found` });
            res.status(200).json({ message: `${name} deleted successfully` });
        } catch (error) {
            res.status(500).json({ message: `Error deleting ${name}`, error: error.message });
        }
    }
});

export const employeeTypeController = createHandler(EmployeeType, "Employee Type");
export const leaveTypeController = createHandler(LeaveType, "Leave Type");
export const documentTypeController = createHandler(DocumentType, "Document Type");
export const nationalityController = createHandler(Nationality, "Nationality");
export const payrollRuleController = createHandler(PayrollRule, "Payroll Rule");
export const workflowTemplateController = createHandler(WorkflowTemplate, "Workflow Template");
