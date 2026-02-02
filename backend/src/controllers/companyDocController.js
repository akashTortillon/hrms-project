import CompanyDocument from "../models/companyDocModel.js";

// GET all docs with Filters & Search
export const getDocs = async (req, res) => {
    try {
        const { search, type, status, department } = req.query;

        let query = {};

        // Search by Name (Case Insensitive)
        if (search) {
            query.name = { $regex: search, $options: "i" };
        }

        // Filter by Type
        if (type && type !== "All Types") {
            query.type = type;
        }

        // Filter by Status
        if (status && status !== "All Status") {
            query.status = status;
        }

        // Filter by Department
        if (department && department !== "All Departments") {
            query.department = department;
        }

        const docs = await CompanyDocument.find(query).sort({ expiryDate: 1 });
        res.json(docs);
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

        const { name, type, location, issueDate, expiryDate, department } = req.body;
        const uploaderId = req.user.id || req.user._id;
        const uploaderRole = req.user.role || "Admin";
        const uploaderName = req.user.name || "System User";

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

        const normalizedPath = req.file.path.replace(/\\/g, "/");

        const newDoc = new CompanyDocument({
            name,
            type,
            location,
            department,
            issueDate,
            expiryDate: expiryDate || null,
            status,
            uploadedBy: uploaderId,
            uploaderRole: uploaderRole,
            filePath: normalizedPath,
            auditTrail: [{
                action: "Upload",
                user: uploaderId,
                userName: uploaderName,
                details: `Document uploaded: ${name}`
            }]
        });

        const savedDoc = await newDoc.save();
        res.status(201).json(savedDoc);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// REPLACE/UPDATE doc (Version Control)
export const replaceDoc = async (req, res) => {
    try {
        const { id } = req.params;
        const doc = await CompanyDocument.findById(id);
        if (!doc) return res.status(404).json({ message: "Document not found" });

        const uploaderId = req.user.id || req.user._id;
        const uploaderName = req.user.name || "System User";
        const { note, expiryDate } = req.body;

        // Archive current version
        doc.versions.push({
            filePath: doc.filePath,
            uploadedAt: doc.updatedAt || doc.uploadedAt,
            uploadedBy: doc.uploadedBy,
            note: "Previous version"
        });

        // Update with new file if provided
        if (req.file) {
            doc.filePath = req.file.path.replace(/\\/g, "/");
        }

        // Update expiry and recalculate status if provided
        if (expiryDate) {
            doc.expiryDate = expiryDate;
            let status = "Valid";
            const today = new Date();
            const expiry = new Date(expiryDate);
            const diffTime = expiry - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < 0) status = "Expired";
            else if (diffDays <= 10) status = "Critical";
            else if (diffDays <= 30) status = "Expiring Soon";
            doc.status = status;
        }

        // Log to audit trail
        doc.auditTrail.push({
            action: "Replace",
            user: uploaderId,
            userName: uploaderName,
            details: note || "Document version replaced"
        });

        const updatedDoc = await doc.save();
        res.json(updatedDoc);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET doc audit trail & history
export const getDocHistory = async (req, res) => {
    try {
        const doc = await CompanyDocument.findById(req.params.id)
            .select("auditTrail versions name type");
        if (!doc) return res.status(404).json({ message: "Document not found" });
        res.json(doc);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// DELETE doc
export const deleteDoc = async (req, res) => {
    try {
        const doc = await CompanyDocument.findById(req.params.id);
        if (!doc) return res.status(404).json({ message: "Document not found" });

        // TODO: Ideally delete file(s) from disk here too using fs.unlink
        await CompanyDocument.findByIdAndDelete(req.params.id);
        res.json({ message: "Document deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET Doc Stats
export const getDocStats = async (req, res) => {
    try {
        const total = await CompanyDocument.countDocuments();
        const valid = await CompanyDocument.countDocuments({ status: "Valid" });
        const expiring = await CompanyDocument.countDocuments({ status: "Expiring Soon" });
        const expired = await CompanyDocument.countDocuments({ status: "Expired" });
        const critical = await CompanyDocument.countDocuments({ status: "Critical" });

        res.json({
            total,
            valid,
            expiring,
            expired,
            critical
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
