import { S3Client } from "@aws-sdk/client-s3";
import multer from "multer";
import multerS3 from "multer-s3";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// AWS S3 Client Initialization
const s3 = new S3Client({
    region: process.env.AWS_REGION || "eu-north-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

// File Type Validation Helper
function checkFileType(file, cb) {
    const filetypes = /jpg|jpeg|png|pdf|doc|docx/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error("Only JPG, JPEG, PNG, PDF, DOC, and DOCX files are allowed."));
    }
}

// Global S3 Storage Configuration
const storage = multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET_NAME || "kayzen",
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: function (req, file, cb) {
        cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
        // Dynamic folder structure based on fieldname or route
        const folder = req.params.type || "general";
        const filename = `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`;
        cb(null, `${folder}/${filename}`);
    },
});

const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    },
});

export default upload;
