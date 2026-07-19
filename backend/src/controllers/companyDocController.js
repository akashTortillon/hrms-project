import CompanyDocument from "../models/companyDocModel.js";
import EmployeeDocument from "../models/employeeDocumentModel.js";
import Employee from "../models/employeeModel.js";
import { deleteStoredFile, getSignedFileUrl, storeUploadedFile } from "../utils/storage.js";
import { computeExpiryStatus } from "../utils/expiryStatus.js";

// GET all docs with Filters & Search
export const getDocs = async (req, res) => {
    try {
        const { search, type, status } = req.query;

        let query = {};

        // Search by Name (Case Insensitive)
        if (search) {
            query.name = { $regex: search, $options: "i" };
        }

        // Filter by Type
        if (type && type !== "All Types") {
            query.type = type;
        }

        // Status is recomputed from expiryDate below (the stored field goes stale as
        // time passes), so filter on it after fetching rather than in the DB query.
        const docs = await CompanyDocument.find(query).sort({ expiryDate: 1 });
        let signedDocs = await Promise.all(
            docs.map(async (doc) => {
                const item = doc.toObject();
                item.status = computeExpiryStatus(item.expiryDate);
                item.fileUrl = await getSignedFileUrl(item);
                return item;
            })
        );

        if (status && status !== "All Status") {
            signedDocs = signedDocs.filter(d => d.status === status);
        }

        res.json(signedDocs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// UPLOAD new doc
export const uploadDoc = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const { name, type, location, issueDate, expiryDate } = req.body;
        const uploaderId = req.user.id || req.user._id;
        const uploaderRole = req.user.role || "Admin"; // Fallback to Admin if undefined

        // Calculate Status
        let status = "Valid";

        if (expiryDate) {
            const today = new Date();
            const expiry = new Date(expiryDate);
            const diffTime = expiry - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < 0) status = "Expired";
            else if (diffDays <= 10) status = "Critical";
            else if (diffDays <= 30) status = "Expiring Soon";
        }

        const storedFile = await storeUploadedFile({
            file: req.file,
            folder: "company-documents",
            preferS3: true
        });

        const newDoc = new CompanyDocument({
            name,
            type,
            location,
            issueDate,
            expiryDate: expiryDate || null,
            status, // Save calculated status
            uploadedBy: uploaderId,
            uploaderRole: uploaderRole,
            filePath: storedFile.filePath,
            fileUrl: storedFile.fileUrl,
            storage: storedFile.storage,
        });

        const savedDoc = await newDoc.save();
        res.status(201).json(savedDoc);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// DELETE doc
export const deleteDoc = async (req, res) => {
    try {
        const doc = await CompanyDocument.findById(req.params.id);
        if (!doc) return res.status(404).json({ message: "Document not found" });

        deleteStoredFile(doc.filePath, doc.storage);
        await CompanyDocument.findByIdAndDelete(req.params.id);
        res.json({ message: "Document deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
// GET Doc Stats
// Default scope unifies three expiry sources so the Dashboard card reflects the whole
// org: Company documents, per-employee uploaded documents (passport/visa/EID scans via
// EmployeeDocument), and the expiry fields stored directly on Employee
// (passportExpiry/emiratesIdExpiry/visaExpiry) for employees who never uploaded a scan.
// Pass ?scope=company (used by the Document Library page) to count Company documents only.
// Status is recomputed from expiryDate at request time, not read from the stored
// `status` field, which is only set once at upload time and goes stale.
export const getDocStats = async (req, res) => {
    try {
        const counts = { total: 0, valid: 0, expiring: 0, expired: 0, critical: 0 };
        const bump = (expiryDate) => {
            counts.total++;
            const status = computeExpiryStatus(expiryDate);
            if (status === "Valid") counts.valid++;
            else if (status === "Expiring Soon") counts.expiring++;
            else if (status === "Expired") counts.expired++;
            else if (status === "Critical") counts.critical++;
        };

        const companyDocs = await CompanyDocument.find({}, { expiryDate: 1 });
        companyDocs.forEach(d => bump(d.expiryDate));

        if (req.query.scope !== "company") {
            const employeeDocs = await EmployeeDocument.find({}, { expiryDate: 1 });
            employeeDocs.forEach(d => bump(d.expiryDate));

            const employees = await Employee.find(
                { $or: [{ passportExpiry: { $ne: null } }, { emiratesIdExpiry: { $ne: null } }, { visaExpiry: { $ne: null } }] },
                { passportExpiry: 1, emiratesIdExpiry: 1, visaExpiry: 1 }
            );
            employees.forEach(e => {
                if (e.passportExpiry) bump(e.passportExpiry);
                if (e.emiratesIdExpiry) bump(e.emiratesIdExpiry);
                if (e.visaExpiry) bump(e.visaExpiry);
            });
        }

        res.json(counts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
