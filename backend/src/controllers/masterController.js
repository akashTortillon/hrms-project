import Master from "../models/masterModel.js";

// Mapping frontend "slugs" to db types
const TYPE_MAPPING = {
    // HR
    "departments": "DEPARTMENT",
    "branches": "BRANCH",
    "companies": "COMPANY",
    "designations": "DESIGNATION",
    "employee-types": "EMPLOYEE_TYPE",
    "leave-types": "LEAVE_TYPE",
    "document-types": "DOCUMENT_TYPE",
    "nationalities": "NATIONALITY",
    "payroll-rules": "PAYROLL_RULE",
    "workflow-templates": "WORKFLOW_TEMPLATE",
    "shifts": "SHIFT",

    // Asset
    "asset-types": "ASSET_TYPE",
    "asset-categories": "ASSET_CATEGORY",
    "status-labels": "ASSET_STATUS",
    "vendors": "VENDOR",
    "service-types": "SERVICE_TYPE",
    "roles": "ROLE",
    "maintenance-shops": "MAINTENANCE_SHOP"
};

import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import dotenv from "dotenv";

dotenv.config();

let _s3Client = null;
const getS3Client = () => {
    if (!_s3Client) {
        _s3Client = new S3Client({
            region: process.env.AWS_REGION || "eu-north-1",
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
        });
    }
    return _s3Client;
};


export const getItems = async (req, res) => {
    try {
        const { type } = req.params;
        const dbType = TYPE_MAPPING[type] || type.toUpperCase();

        let items = await Master.find({ type: dbType, isActive: true })
            .sort({ name: 1 });

        // Generate Pre-Signed URLs for S3 images to bypass private bucket restrictions
        const bucket = process.env.AWS_S3_BUCKET_NAME || "kayzen";
        const signedItems = [];

        for (const item of items) {
            const itemObj = item.toObject();
            if (itemObj.image && itemObj.image.includes("amazonaws.com")) {
                try {
                    const url = new URL(itemObj.image);
                    let key = decodeURIComponent(url.pathname.substring(1));
                    if (key.startsWith(bucket + "/")) {
                        key = key.substring(bucket.length + 1);
                    }
                    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
                    itemObj.image = await getSignedUrl(getS3Client(), command, { expiresIn: 43200 }); // 12 hours
                } catch (error) {
                    console.error(`Failed to sign URL for ${itemObj.name}:`, error);
                }
            }
            signedItems.push(itemObj);
        }

        res.status(200).json(signedItems);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const addItem = async (req, res) => {
    try {
        const { type } = req.params;
        const dbType = TYPE_MAPPING[type] || type.toUpperCase();

        // Handle both simple { name } and complex payloads
        const payload = {
            ...req.body,
            type: dbType
        };

        // Ensure image isn't an empty object or invalid type from req.body
        if (typeof payload.image === 'object') {
            delete payload.image;
        }

        // If file was uploaded (from S3 middleware)
        if (req.file && req.file.location) {
            payload.image = req.file.location;
        }

        const newItem = new Master(payload);
        await newItem.save();
        
        let itemObj = newItem.toObject();
        if (itemObj.image && itemObj.image.includes("amazonaws.com")) {
            try {
                const bucket = process.env.AWS_S3_BUCKET_NAME || "kayzen";
                const url = new URL(itemObj.image);
                let key = decodeURIComponent(url.pathname.substring(1));
                if (key.startsWith(bucket + "/")) {
                    key = key.substring(bucket.length + 1);
                }
                const command = new GetObjectCommand({ Bucket: bucket, Key: key });
                itemObj.image = await getSignedUrl(getS3Client(), command, { expiresIn: 43200 });
            } catch (error) {
                console.error(`Failed to sign URL for ${itemObj.name}:`, error);
            }
        }

        res.status(201).json(itemObj);
    } catch (error) {
        // Handle duplicate key error
        if (error.code === 11000) {
            console.error("Duplicate key error in addItem:", error);
            return res.status(400).json({ message: `Item with name "${req.body.name}" already exists in this list` });
        }
        res.status(500).json({ message: error.message });
    }
};

export const updateItem = async (req, res) => {
    try {
        const { type, id } = req.params;
        const dbType = TYPE_MAPPING[type] || type.toUpperCase();
        
        const payload = { ...req.body };
        payload.type = dbType;

        // Ensure image isn't an empty object or invalid type from req.body
        if (typeof payload.image === 'object') {
            delete payload.image;
        }

        // If new file was uploaded (from S3 middleware)
        if (req.file && req.file.location) {
            payload.image = req.file.location;
        }

        const updated = await Master.findByIdAndUpdate(id, payload, { new: true });
        if (!updated) return res.status(404).json({ message: "Item not found" });

        let itemObj = updated.toObject();
        if (itemObj.image && itemObj.image.includes("amazonaws.com")) {
            try {
                const bucket = process.env.AWS_S3_BUCKET_NAME || "kayzen";
                const url = new URL(itemObj.image);
                let key = decodeURIComponent(url.pathname.substring(1));
                if (key.startsWith(bucket + "/")) {
                    key = key.substring(bucket.length + 1);
                }
                const command = new GetObjectCommand({ Bucket: bucket, Key: key });
                itemObj.image = await getSignedUrl(getS3Client(), command, { expiresIn: 43200 });
            } catch (error) {
                console.error(`Failed to sign URL for ${itemObj.name}:`, error);
            }
        }

        res.status(200).json(itemObj);
    } catch (error) {
        // Handle duplicate key error for updates too
        if (error.code === 11000) {
            console.error("Duplicate key error in updateItem:", error);
            return res.status(400).json({ message: `Item with name "${req.body.name}" already exists in this list (Update)` });
        }
        res.status(500).json({ message: error.message });
    }
};

export const deleteItem = async (req, res) => {
    // ... existing logic ...
};

export const cleanupMasterData = async (req, res) => {
    try {
        const allMasters = await Master.find({});
        let updatedCount = 0;
        let deletedCount = 0;

        for (const master of allMasters) {
            let needsUpdate = false;
            let newType = master.type;

            // 1. Normalize type names (handle lowercase slugs)
            if (TYPE_MAPPING[master.type.toLowerCase()]) {
                newType = TYPE_MAPPING[master.type.toLowerCase()];
                needsUpdate = true;
            } else if (master.type !== master.type.toUpperCase()) {
                newType = master.type.toUpperCase();
                needsUpdate = true;
            }

            if (needsUpdate) {
                try {
                    await Master.findByIdAndUpdate(master._id, { type: newType });
                    updatedCount++;
                } catch (err) {
                    if (err.code === 11000) {
                        await Master.findByIdAndDelete(master._id);
                        deletedCount++;
                    } else {
                        throw err;
                    }
                }
            }
        }

        res.status(200).json({ 
            message: "Cleanup complete", 
            updated: updatedCount, 
            deleted: deletedCount 
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
