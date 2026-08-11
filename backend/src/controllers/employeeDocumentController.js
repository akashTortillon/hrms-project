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

// A Manager has no MANAGE_DOCUMENTS/isDocumentManager permission, so before this they
// could only ever see their OWN documents, never their direct reports' - even though
// the whole point of assigning them as designatedManager is that they oversee that
// person. Mirrors the [user._id, user.employeeId] scope pattern used in
// approvalStageFilter.js / requestController.js's manager-routing checks.
const isManagerOfEmployee = async (user, employeeId) => {
    const isManagerRole = user?.role === "Manager" || user?.permissions?.includes("APPROVE_MANAGER_REQUESTS");
    if (!isManagerRole) return false;

    const scope = [user._id, user.employeeId].filter(Boolean).map(String);
    if (!scope.length) return false;

    const target = await Employee.findById(employeeId).select("designatedManager");
    return Boolean(target?.designatedManager && scope.includes(String(target.designatedManager)));
};

// Maps a Document Type master label to the bare Employee field the Dashboard's
// "Employee Visa/ID Expiries" card reads directly (dashboardController.js's
// getEmployeeVisaExpiries). Uploading a new document via the Documents tab only
// ever created an EmployeeDocument row - it never touched this bare field, so the
// Dashboard kept showing the old expiry indefinitely even after a valid new
// document was uploaded. Labour Card is handled separately below since it's an
// array of cards, not a single field.
const BARE_EXPIRY_FIELD_BY_TYPE = {
    VISA: "visaExpiry",
    PASSPORT: "passportExpiry",
    "EMIRATES ID": "emiratesIdExpiry"
};

// Syncs a newly-uploaded document's expiry back onto the corresponding bare
// Employee field (or labor card entry), and marks any prior EmployeeDocument of
// the same employeeId+documentType as superseded so it stops surfacing as
// "expired" on the Dashboard/Documents tab once a newer one exists.
const syncEmployeeExpiryAndSupersedePrior = async ({ employeeId, documentType, expiryDate, documentNumber, newDocumentId }) => {
    const typeUpper = String(documentType || "").toUpperCase();

    await EmployeeDocument.updateMany(
        { employeeId, documentType, _id: { $ne: newDocumentId } },
        { $set: { isActive: false } }
    );

    if (!expiryDate) return;

    const bareField = BARE_EXPIRY_FIELD_BY_TYPE[typeUpper];
    if (bareField) {
        await Employee.findByIdAndUpdate(employeeId, { [bareField]: expiryDate });
        return;
    }

    if (typeUpper === "LABOUR CARD" || typeUpper === "LABOR CARD") {
        const employee = await Employee.findById(employeeId).select("laborCards");
        if (!employee) return;
        const cards = employee.laborCards || [];
        let target = documentNumber ? cards.find((c) => c.number === documentNumber) : null;
        if (!target && cards.length === 1) target = cards[0];
        if (target) {
            target.expiryDate = expiryDate;
            await employee.save();
        }
    }
};

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

        await syncEmployeeExpiryAndSupersedePrior({
            employeeId,
            documentType,
            expiryDate,
            documentNumber,
            newDocumentId: newDoc._id
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

        await syncEmployeeExpiryAndSupersedePrior({
            employeeId,
            documentType,
            expiryDate,
            documentNumber,
            newDocumentId: document._id
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
        const isManaging = !canManage && !isSelf && await isManagerOfEmployee(req.user, employeeId);

        if (!canManage && !isSelf && !isManaging) {
            return res.status(403).json({ message: "You can only view your own documents" });
        }

        const documents = await EmployeeDocument.find({ employeeId, isActive: { $ne: false } }).sort({ createdAt: -1 });
        const signedDocuments = await Promise.all(documents.map(attachSignedFileUrl));

        // Superset with the Dashboard's expiry widget (dashboardController.js's
        // getEmployeeVisaExpiries): surface passport/visa/Emirates ID/labor-card expiry
        // dates stored directly on the Employee record even when no file was ever
        // uploaded for them - otherwise an expired date shows on the Dashboard but
        // nowhere on this employee's own Documents tab. Skipped when a real uploaded
        // document of that type already exists, to avoid a redundant duplicate row.
        const employee = await Employee.findById(employeeId).select("visaExpiry passportExpiry emiratesIdExpiry laborCards");
        // Match the Document Type master's own casing ("PASSPORT", "VISA", "EMIRATES ID",
        // "LABOUR CARD") - this is what the Upload Document form's dropdown actually stores,
        // so the synthetic label must match exactly both for the dedup check below and so
        // the "Upload" button here can prefill that same dropdown correctly.
        const uploadedTypes = new Set(signedDocuments.map((doc) => String(doc.documentType).toUpperCase()));
        const syntheticSources = [
            { documentType: "VISA", expiryDate: employee?.visaExpiry },
            { documentType: "PASSPORT", expiryDate: employee?.passportExpiry },
            { documentType: "EMIRATES ID", expiryDate: employee?.emiratesIdExpiry },
            ...(employee?.laborCards || []).map((card) => ({
                documentType: "LABOUR CARD",
                expiryDate: card.expiryDate,
                label: card.number ? `Card ${card.number}` : ""
            }))
        ];

        const syntheticDocuments = syntheticSources
            .filter((source) => source.expiryDate && !uploadedTypes.has(source.documentType))
            .map((source) => ({
                _id: `synthetic-${employeeId}-${source.documentType}-${source.label || ""}`,
                employeeId,
                documentType: source.documentType,
                label: source.label || "",
                expiryDate: source.expiryDate,
                status: computeExpiryStatus(source.expiryDate),
                noFileUploaded: true
            }));

        res.json([...signedDocuments, ...syntheticDocuments]);
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

        const documents = await EmployeeDocument.find({ employeeId, isActive: { $ne: false } }).sort({ createdAt: -1 });
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
