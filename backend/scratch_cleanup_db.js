import mongoose from "mongoose";
import dotenv from "dotenv";
import Master from "./src/models/masterModel.js";

dotenv.config();

const TYPE_MAPPING = {
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
    "asset-types": "ASSET_TYPE",
    "asset-categories": "ASSET_CATEGORY",
    "status-labels": "ASSET_STATUS",
    "vendors": "VENDOR",
    "service-types": "SERVICE_TYPE",
    "roles": "ROLE",
    "maintenance-shops": "MAINTENANCE_SHOP"
};

async function cleanup() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        const allMasters = await Master.find({});
        console.log(`Found ${allMasters.length} masters`);

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
                console.log(`Updating ${master.name}: ${master.type} -> ${newType}`);
                try {
                    await Master.findByIdAndUpdate(master._id, { type: newType });
                } catch (err) {
                    if (err.code === 11000) {
                        console.log(`Duplicate found for ${master.name} in type ${newType}. Deleting the old one.`);
                        await Master.findByIdAndDelete(master._id);
                    } else {
                        throw err;
                    }
                }
            }
        }

        console.log("Cleanup complete");
        process.exit(0);
    } catch (error) {
        console.error("Cleanup failed:", error);
        process.exit(1);
    }
}

cleanup();
