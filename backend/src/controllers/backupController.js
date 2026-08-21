import mongoose from "mongoose";
import { buildZipArchive } from "../utils/zip.js";
import { logActivity } from "../utils/activityLogger.js";

// Pure driver-level dump - no mongodump binary available in this environment
// (Atlas SRV connection, not a local mongod). One JSON file per collection,
// zipped with the same hand-rolled buildZipArchive already used for SIF exports.
export const downloadBackup = async (req, res) => {
    try {
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();

        const zipEntries = [];
        for (const { name } of collections) {
            const docs = await db.collection(name).find({}).toArray();
            zipEntries.push({ name: `${name}.json`, content: JSON.stringify(docs, null, 2) });
        }

        const archive = buildZipArchive(zipEntries);

        res.setHeader("Content-Disposition", `attachment; filename="hrms_backup_${new Date().toISOString().slice(0, 10)}.zip"`);
        res.setHeader("Content-Type", "application/zip");
        res.send(archive);

        logActivity({
            req,
            action: "EXPORT",
            module: "SETTINGS",
            description: `${req.user?.name || "Admin"} generated a full database backup (${collections.length} collections)`
        }).catch(() => {});
    } catch (error) {
        console.error("Backup failed:", error);
        res.status(500).json({ message: "Backup failed: " + error.message });
    }
};
