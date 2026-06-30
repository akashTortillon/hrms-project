import fs from 'fs';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
dotenv.config();

// Create S3 client if configured
let s3Client = null;
if (process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY && process.env.S3_BUCKET_NAME) {
    s3Client = new S3Client({
        region: process.env.S3_REGION || 'us-east-1',
        credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY,
            secretAccessKey: process.env.S3_SECRET_KEY
        },
        endpoint: process.env.S3_ENDPOINT || undefined,
        forcePathStyle: !!process.env.S3_ENDPOINT // typically required for custom endpoints like MinIO
    });
}

/**
 * Universally delete a file (either locally or from S3)
 * @param {string} filePath - Local path or S3 URL
 */
export const deleteFile = async (filePath) => {
    if (!filePath) return;

    try {
        // Check if it's an S3 URL (http/https)
        if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
            if (!s3Client) {
                console.warn("Attempted to delete S3 object, but S3 is not configured in ENV.");
                return;
            }

            // Extract the object key from the URL
            const urlObj = new URL(filePath);
            
            let key = urlObj.pathname;
            if (key.startsWith('/')) {
                key = key.substring(1);
            }
            
            // If using forcePathStyle, the bucket name might be the first part of the path
            if (process.env.S3_ENDPOINT && key.startsWith(`${process.env.S3_BUCKET_NAME}/`)) {
                key = key.substring(process.env.S3_BUCKET_NAME.length + 1);
            }

            const command = new DeleteObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: decodeURIComponent(key)
            });

            await s3Client.send(command);
        } else {
            // It's a local file path
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
    } catch (error) {
        console.error("Error deleting file:", error);
    }
};
