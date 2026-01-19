import EmployeeDocument from "../models/employeeDocumentModel.js";
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
        console.error("Add Employee Doc Error:", error);
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
        console.error("Get Employee Docs Error:", error);
        res.status(500).json({ message: "Server error" });
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
        console.error("Delete Employee Doc Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
