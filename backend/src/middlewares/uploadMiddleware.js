import multer from "multer";
import path from "path";
import fs from "fs";
import { S3Client } from '@aws-sdk/client-s3';
import multerS3 from 'multer-s3';
import dotenv from 'dotenv';
dotenv.config();

// Ensure uploads directory exists for local fallback
const uploadDir = "uploads/workflows";
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

let storage;

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
        acl: 'public-read',
        metadata: function (req, file, cb) {
            cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
            cb(null, `uploads/workflows/${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
        }
    });
} else {
    storage = multer.diskStorage({
        destination(req, file, cb) {
            cb(null, "uploads/workflows/");
        },
        filename(req, file, cb) {
            cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
        },
    });
}

function checkFileType(file, cb) {
    const filetypes = /jpg|jpeg|png|pdf|doc|docx/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb("Images and Documents only!");
    }
}

const upload = multer({
    storage,
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    },
});

export default upload;
