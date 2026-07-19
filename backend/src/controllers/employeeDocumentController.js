import EmployeeDocument from "../models/employeeDocumentModel.js";
import Employee from "../models/employeeModel.js";
import User from "../models/userModel.js";
import { deleteStoredFile, getSignedFileUrl, s3ObjectExists, storeUploadedFile } from "../utils/storage.js";
import { computeExpiryStatus } from "../utils/expiryStatus.js";
import { logActivity } from "../utils/activityLogger.js";
import fs from "fs";
import path from "path";

const isDocumentManager = (user = {}) =>
    user.role === "Admin"
    || user.role === "HR"
    || user.role === "HR Admin"
    || user.permissions?.includes("ALL")
    || user.permissions?.includes("MANAGE_DOCUMENTS");

const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const resolveEmployeeIdForUser = async (user) => {
    if (user.employeeId) return user.employeeId;

    if (!user.email) return null;

    const employee = await Employee.findOne({
        email: { $regex: new RegExp(`^${escapeRegex(user.email)}$`, "i") }
    }).select("_id");

    if (employee?._id) {
        await User.findByIdAndUpdate(user._id, { employeeId: employee._id });
    }

    return employee?._id || null;
};

const canAccessDocument = async (user, document) => {
    if (isDocumentManager(user)) return true;
    const employeeId = await resolveEmployeeIdForUser(user);
    return employeeId && document.employeeId?.toString() === employeeId.toString();
};

const attachSignedFileUrl = async (document) => {
    const item = document.toObject ? document.toObject() : { ...document };
    item.fileUrl = await getSignedFileUrl(item);
    // Recompute status from expiryDate - the stored value is only set once at
    // upload time and goes stale as the expiry date approaches/passes.
    item.status = computeExpiryStatus(item.expiryDate);
    return item;
};

// Add Document
export const addDocument = async (req, res) => {
    try {
        const { employeeId, documentType, label, documentNumber, expiryDate } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: "File is required" });
        }

        if (!employeeId || !documentType) {
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

        const storedFile = await storeUploadedFile({
            file,
            folder: "employee-documents",
            preferS3: true
        });

        const newDoc = await EmployeeDocument.create({
            employeeId,
            documentType,
            label: label || "",
            documentNumber,
            expiryDate,
            filePath: storedFile.filePath,
            fileUrl: storedFile.fileUrl,
            storage: storedFile.storage,
            status,
            uploadedBy: req.user?._id || null
        });

        res.status(201).json(newDoc);

        logActivity({
            req,
            action: "CREATE",
            module: "DOCUMENTS",
            description: `Document "${documentType}" uploaded for employee ${employeeId}`,
            targetId: newDoc._id,
            targetName: documentType,
            metadata: { employeeId, documentType, documentNumber, expiryDate }
        }).catch(() => {});
    } catch (error) {
        // console.error("Add Employee Doc Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const uploadMyDocument = async (req, res) => {
    try {
        const user = req.user;
        const { documentType, label, documentNumber, expiryDate } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: "File is required" });
        }

        let employeeId = user.employeeId;
        if (!employeeId) {
            const employee = await Employee.findOne({
                email: { $regex: new RegExp(`^${user.email}$`, "i") }
            });
            employeeId = employee?._id || null;
        }

        if (!employeeId) {
            return res.status(404).json({ message: "No linked employee profile found" });
        }

        let status = "Valid";
        if (expiryDate) {
            const exp = new Date(expiryDate);
            const today = new Date();
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(today.getDate() + 30);

            if (exp < today) status = "Expired";
            else if (exp < thirtyDaysFromNow) status = "Expiring Soon";
        }

        const storedFile = await storeUploadedFile({
            file: req.file,
            folder: "employee-self-service",
            preferS3: true
        });

        const document = await EmployeeDocument.create({
            employeeId,
            documentType,
            label: label || "",
            documentNumber,
            expiryDate,
            filePath: storedFile.filePath,
            fileUrl: storedFile.fileUrl,
            storage: storedFile.storage,
            status,
            uploadedBy: user._id
        });

        if (!user.employeeId) {
            await User.findByIdAndUpdate(user._id, { employeeId });
        }

        res.status(201).json(document);

        logActivity({
            req,
            action: "CREATE",
            module: "DOCUMENTS",
            description: `Employee ${user.name || ""} uploaded own document "${documentType}"`,
            targetId: document._id,
            targetName: documentType,
            metadata: { employeeId: String(employeeId), documentType, self: true }
        }).catch(() => {});
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

// Get Documents for an Employee
export const getEmployeeDocuments = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const canManage = isDocumentManager(req.user);
        const ownEmployeeId = await resolveEmployeeIdForUser(req.user);
        const isSelf = ownEmployeeId && ownEmployeeId.toString() === employeeId;

        if (!canManage && !isSelf) {
            return res.status(403).json({ message: "You can only view your own documents" });
        }

        const documents = await EmployeeDocument.find({ employeeId }).sort({ createdAt: -1 });
        res.json(await Promise.all(documents.map(attachSignedFileUrl)));
    } catch (error) {
        // console.error("Get Employee Docs Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const downloadEmployeeDocument = async (req, res) => {
    try {
        const { documentId } = req.params;
        const document = await EmployeeDocument.findById(documentId);

        if (!document) {
            return res.status(404).json({ message: "Document not found" });
        }

        const allowed = await canAccessDocument(req.user, document);
        if (!allowed) {
            return res.status(403).json({ message: "You do not have access to this document" });
        }

        if (document.storage === "S3") {
            const exists = await s3ObjectExists(document.filePath);
            if (!exists) {
                return res.status(404).json({
                    message: "The document file no longer exists in storage. Please contact HR to re-upload it."
                });
            }
            return res.redirect(await getSignedFileUrl(document.toObject ? document.toObject() : document));
        }

        // LOCAL storage: stream the file off disk (previously this returned 404, so employees
        // could never download documents an admin had uploaded for them locally).
        const absolutePath = path.resolve(document.filePath);
        if (!fs.existsSync(absolutePath)) {
            return res.status(404).json({
                message: "The document file no longer exists on the server. Please contact HR to re-upload it."
            });
        }
        const downloadName = `${document.documentType || "document"}${path.extname(absolutePath) || ""}`.replace(/[^a-z0-9._-]+/gi, "_");
        return res.download(absolutePath, downloadName);
    } catch (error) {
        res.status(500).json({ message: "Failed to download document" });
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
            // Graceful response instead of 404 to prevent frontend crashes
            return res.status(200).json([]);
        }

        const documents = await EmployeeDocument.find({ employeeId }).sort({ createdAt: -1 });
        // console.log(`[DEBUG] Found ${documents.length} documents for employee ${employeeId}`);
        res.json(await Promise.all(documents.map(attachSignedFileUrl)));
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

        deleteStoredFile(doc.filePath, doc.storage);

        await EmployeeDocument.findByIdAndDelete(id);
        res.json({ message: "Document deleted successfully" });

        logActivity({
            req,
            action: "DELETE",
            module: "DOCUMENTS",
            description: `Document "${doc.documentType}" deleted for employee ${doc.employeeId}`,
            targetId: doc._id,
            targetName: doc.documentType,
            metadata: { employeeId: String(doc.employeeId), documentType: doc.documentType }
        }).catch(() => {});
    } catch (error) {
        // console.error("Delete Employee Doc Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
