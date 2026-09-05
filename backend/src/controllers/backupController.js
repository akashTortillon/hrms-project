import mongoose from "mongoose";
import BackupJob from "../models/backupJobModel.js";
import { buildZipArchive } from "../utils/zip.js";
import { storeUploadedFile, getSignedFileUrl } from "../utils/storage.js";
import { logActivity } from "../utils/activityLogger.js";

// Was a single synchronous request: dump every collection, zip in memory (~37MB),
// stream the whole thing back as the response body. Worked on a stable desktop
// connection (~40-50s) but confirmed failing in production on mobile 5G - the
// long-held request gets interrupted before the response completes. Split into
// start/status/download so the client never holds one long-lived request open.
export const startBackup = async (req, res) => {
    try {
        const job = await BackupJob.create({
            status: "pending",
            requestedBy: req.user._id,
            requestedByName: req.user.name
        });

        res.status(202).json({ jobId: job._id, status: "pending" });

        // Fire-and-forget: runs after the response is already sent, fully decoupled
        // from this request/response cycle - closing the tab mid-poll can't affect it.
        setImmediate(() => runBackupJob(job._id, req.user));
    } catch (error) {
        console.error("[backupController] Failed to start backup job:", error);
        res.status(500).json({ message: "Failed to start backup: " + error.message });
    }
};

// Same dump-and-zip logic the old synchronous handler used, moved verbatim - only
// delivery changed, not how the backup itself is built.
async function runBackupJob(jobId, requestedByUser) {
    try {
        await BackupJob.findByIdAndUpdate(jobId, { status: "running", startedAt: new Date() });

        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();

        const zipEntries = [];
        for (const { name } of collections) {
            const docs = await db.collection(name).find({}).toArray();
            zipEntries.push({ name: `${name}.json`, content: JSON.stringify(docs, null, 2) });
        }

        const archive = buildZipArchive(zipEntries);

        // storeUploadedFile (not the private uploadToS3) is the exported entry point -
        // it builds the S3 key itself and returns {filePath, fileUrl, storage}.
        const stored = await storeUploadedFile({
            file: {
                buffer: archive,
                mimetype: "application/zip",
                originalname: `hrms_backup_${jobId}_${new Date().toISOString().slice(0, 10)}.zip`
            },
            folder: "backups",
            preferS3: true
        });

        await BackupJob.findByIdAndUpdate(jobId, {
            status: "ready",
            s3Key: stored.filePath,
            fileSize: archive.length,
            collectionsCount: collections.length,
            completedAt: new Date()
        });

        logActivity({
            req: { user: requestedByUser },
            action: "EXPORT",
            module: "SETTINGS",
            description: `${requestedByUser?.name || "Admin"} generated a full database backup (${collections.length} collections)`
        }).catch(() => {});
    } catch (error) {
        console.error("[backupController] Backup job failed:", error);
        // Double-guarded: a Mongo hiccup while recording the failure itself must never
        // leave the job silently stuck in "running" forever, and must never throw inside
        // a setImmediate callback (unhandled rejection would crash the process).
        await BackupJob.findByIdAndUpdate(jobId, {
            status: "failed",
            error: error.message,
            completedAt: new Date()
        }).catch(() => {});
    }
}

export const getBackupStatus = async (req, res) => {
    try {
        const job = await BackupJob.findById(req.params.jobId);
        if (!job) return res.status(404).json({ message: "Backup job not found" });

        res.json({
            jobId: job._id,
            status: job.status,
            createdAt: job.createdAt,
            completedAt: job.completedAt,
            fileSize: job.fileSize,
            error: job.error
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch backup status: " + error.message });
    }
};

export const downloadBackupFile = async (req, res) => {
    try {
        const job = await BackupJob.findById(req.params.jobId);
        if (!job) return res.status(404).json({ message: "Backup job not found" });
        if (job.status !== "ready") return res.status(409).json({ message: "Backup is not ready yet" });

        // Return the URL as JSON rather than a 302 redirect - a redirect would need the
        // BROWSER's JS (axios/fetch) to follow it and read the response, which requires
        // the S3 bucket to have CORS configured for whatever origin is calling this
        // (confirmed locally: this app's existing employeeDocumentController.js download
        // endpoint uses exactly that redirect pattern, and it fails the same way when
        // tested from an origin the bucket's CORS policy doesn't allowlist - e.g. this
        // local dev origin). Handing back the URL and letting the frontend do a plain
        // <a href> navigation avoids CORS entirely, since a top-level navigation isn't a
        // script-mediated read of the response body.
        const url = await getSignedFileUrl({
            filePath: job.s3Key,
            storage: "S3",
            expiresIn: 300,
            downloadFilename: `hrms_backup_${new Date(job.createdAt).toISOString().slice(0, 10)}.zip`
        });
        res.json({ url });
    } catch (error) {
        res.status(500).json({ message: "Failed to generate download link: " + error.message });
    }
};
