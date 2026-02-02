import multer from "multer";
import path from "path";
import fs from "fs";

// Ensure upload directory exists
const uploadDir = "uploads/";
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Storage Engine
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/");
    },
    filename: function (req, file, cb) {
        // Rename: doc-TIMESTAMP-ORIGINALNAME
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
    },
});

// File Filter (Docs, Images, Excel)
const fileFilter = (req, file, cb) => {
    // console.log("Incoming File MimeType:", file.mimetype); // Debugging
    const allowedMimeTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
        "application/vnd.ms-excel", // .xls
        "text/csv", // .csv
        "application/octet-stream" // Sometimes Excel files come as octet-stream
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        // Fallback: If extension is valid, allow it (Mime-type spoofing/inconsistency check)
        const ext = path.extname(file.originalname).toLowerCase();
        if (['.xlsx', '.xls', '.csv'].includes(ext)) {
            return cb(null, true);
        }
        cb(new Error(`Invalid file type: ${file.mimetype}`), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: fileFilter
});

export default upload;
