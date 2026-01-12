import Department from "../models/departmentModel.js";
import Branch from "../models/branchModel.js";
import Designation from "../models/designationModel.js";

// --- Departments ---

export const getDepartments = async (req, res) => {
    try {
        const departments = await Department.find().sort({ createdAt: -1 });
        res.status(200).json(departments);
    } catch (error) {
        res.status(500).json({ message: "Error fetching departments", error: error.message });
    }
};

export const addDepartment = async (req, res) => {
    try {
        const { name, status } = req.body;
        const existing = await Department.findOne({ name });
        if (existing) {
            return res.status(400).json({ message: "Department already exists" });
        }
        const newDept = new Department({ name, status });
        await newDept.save();
        res.status(201).json(newDept);
    } catch (error) {
        res.status(500).json({ message: "Error adding department", error: error.message });
    }
};

export const updateDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, status } = req.body;
        const updatedDept = await Department.findByIdAndUpdate(
            id,
            { name, status },
            { new: true }
        );
        if (!updatedDept) {
            return res.status(404).json({ message: "Department not found" });
        }
        res.status(200).json(updatedDept);
    } catch (error) {
        res.status(500).json({ message: "Error updating department", error: error.message });
    }
};

export const deleteDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Department.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ message: "Department not found" });
        }
        res.status(200).json({ message: "Department deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting department", error: error.message });
    }
};

// --- Branches ---

export const getBranches = async (req, res) => {
    try {
        const branches = await Branch.find().sort({ createdAt: -1 });
        res.status(200).json(branches);
    } catch (error) {
        res.status(500).json({ message: "Error fetching branches", error: error.message });
    }
};

export const addBranch = async (req, res) => {
    try {
        const { name, location, status } = req.body;
        const existing = await Branch.findOne({ name });
        // Note: Same name might exist in different locations? For now assume unique name.
        if (existing) {
            // If strict uniqueness is needed. For branches, maybe name isn't unique globally but within company?
            // Let's create it anyway unless exactly same.
        }

        const newBranch = new Branch({ name, location, status });
        await newBranch.save();
        res.status(201).json(newBranch);
    } catch (error) {
        res.status(500).json({ message: "Error adding branch", error: error.message });
    }
};

export const updateBranch = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, location, status } = req.body;
        const updatedBranch = await Branch.findByIdAndUpdate(
            id,
            { name, location, status },
            { new: true }
        );
        if (!updatedBranch) {
            return res.status(404).json({ message: "Branch not found" });
        }
        res.status(200).json(updatedBranch);
    } catch (error) {
        res.status(500).json({ message: "Error updating branch", error: error.message });
    }
};

export const deleteBranch = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Branch.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ message: "Branch not found" });
        }
        res.status(200).json({ message: "Branch deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting branch", error: error.message });
    }
};

// --- Designations ---

export const getDesignations = async (req, res) => {
    try {
        const designations = await Designation.find().sort({ createdAt: -1 });
        res.status(200).json(designations);
    } catch (error) {
        res.status(500).json({ message: "Error fetching designations", error: error.message });
    }
};

export const addDesignation = async (req, res) => {
    try {
        const { name, status } = req.body;
        const existing = await Designation.findOne({ name });
        if (existing) {
            return res.status(400).json({ message: "Designation already exists" });
        }
        const newDesig = new Designation({ name, status });
        await newDesig.save();
        res.status(201).json(newDesig);
    } catch (error) {
        res.status(500).json({ message: "Error adding designation", error: error.message });
    }
};

export const updateDesignation = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, status } = req.body;
        const updated = await Designation.findByIdAndUpdate(
            id,
            { name, status },
            { new: true }
        );
        if (!updated) {
            return res.status(404).json({ message: "Designation not found" });
        }
        res.status(200).json(updated);
    } catch (error) {
        res.status(500).json({ message: "Error updating designation", error: error.message });
    }
};

export const deleteDesignation = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Designation.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ message: "Designation not found" });
        }
        res.status(200).json({ message: "Designation deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting designation", error: error.message });
    }
};
