import EmployeeDocument from "../models/employeeDocumentModel.js";
import Employee from "../models/employeeModel.js";
import fs from "fs";
import path from "path";

// Add Document
export const addDocument = async (req, res) => {
    try {
        const { employeeId, documentType, documentNumber, expiryDate } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: "File is required" });
        }

        if (!employeeId || !documentType) {
            // Clean up file if validation fails
            fs.unlinkSync(file.path);
            return res.status(400).json({ message: "Employee ID and Document Type are required" });
        }

        // Determine status based on expiryDate
        let status = "Valid";
        if (expiryDate) {
            const exp = new Date(expiryDate);
            const today = new Date();
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(today.getDate() + 30);

            if (exp < today) {
                status = "Expired";
            } else if (exp < thirtyDaysFromNow) {
                status = "Expiring Soon";
            }
        }

        const newDoc = await EmployeeDocument.create({
            employeeId,
            documentType,
            documentNumber,
            expiryDate,
            filePath: file.path,
            status
        });

        res.status(201).json(newDoc);
    } catch (error) {
        // console.error("Add Employee Doc Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Get Documents for an Employee
export const getEmployeeDocuments = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const documents = await EmployeeDocument.find({ employeeId }).sort({ createdAt: -1 });
        res.json(documents);
    } catch (error) {
        // console.error("Get Employee Docs Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Get My Documents (Logged in user)
export const getMyDocuments = async (req, res) => {
    try {
        const user = req.user;
        let employeeId = user.employeeId;

        // Fallback: If no linked employeeId, try to find by email (Case-Insensitive)
        if (!employeeId) {
            // console.log(`[DEBUG] No direct employeeId for user ${user.email}. Attempting email lookup...`);
            const employee = await Employee.findOne({
                email: { $regex: new RegExp(`^${user.email}$`, "i") }
            });

            if (employee) {
                employeeId = employee._id;
                // console.log(`[DEBUG] Found matching employee ${employeeId} for email ${user.email}. Healing link...`);
                user.employeeId = employee._id;
                await user.save({ validateBeforeSave: false });
            }
        }

        if (!employeeId) {
            // console.warn(`[WARN] No linked employee profile found for user: ${user.email}`);
            return res.status(404).json({
                message: "No linked employee profile found for this user. Please ensure your user email matches your employee record or contact admin.",
                code: "NO_LINKED_PROFILE"
            });
        }

        const documents = await EmployeeDocument.find({ employeeId }).sort({ createdAt: -1 });
        // console.log(`[DEBUG] Found ${documents.length} documents for employee ${employeeId}`);
        res.json(documents);
    } catch (error) {
        // console.error("Get My Docs Error:", error);
        res.status(500).json({ message: "Server error while fetching personal documents" });
    }
};

// Delete Document
export const deleteDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const doc = await EmployeeDocument.findById(id);

        if (!doc) {
            return res.status(404).json({ message: "Document not found" });
        }

        // Delete file from filesystem
        if (fs.existsSync(doc.filePath)) {
            fs.unlinkSync(doc.filePath);
        }

        await EmployeeDocument.findByIdAndDelete(id);
        res.json({ message: "Document deleted successfully" });
    } catch (error) {
        // console.error("Delete Employee Doc Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
