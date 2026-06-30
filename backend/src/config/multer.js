import multer from "multer";
import path from "path";
import fs from "fs";
import { S3Client } from '@aws-sdk/client-s3';
import multerS3 from 'multer-s3';
import dotenv from 'dotenv';
dotenv.config();

// Ensure upload directory exists for local fallback
const uploadDir = "uploads/";
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Fallback/Local storage explicitly for imports or local mode
const localStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/");
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
    },
});

let storage = localStorage;

if (process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY && process.env.S3_BUCKET_NAME) {
    const s3Config = new S3Client({
        region: process.env.S3_REGION || 'us-east-1',
        credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY,
            secretAccessKey: process.env.S3_SECRET_KEY
        },
        endpoint: process.env.S3_ENDPOINT || undefined,
        forcePathStyle: !!process.env.S3_ENDPOINT
    });

    storage = multerS3({
        s3: s3Config,
        bucket: process.env.S3_BUCKET_NAME,
        acl: 'public-read', // Depends on bucket config, adjust if needed
        metadata: function (req, file, cb) {
            cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
            const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
            cb(null, `uploads/${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
        }
    });
}

// File Filter (Docs, Images, Excel)
const fileFilter = (req, file, cb) => {
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

export const uploadLocal = multer({
    storage: localStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: fileFilter
});

export default upload;
