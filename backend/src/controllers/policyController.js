import PolicyDocument from "../models/policyDocumentModel.js";
import Announcement from "../models/announcementModel.js";
import { deleteStoredFile, getSignedFileUrl, storeUploadedFile } from "../utils/storage.js";
import { logActivity } from "../utils/activityLogger.js";

export const getPolicies = async (req, res) => {
  try {
    const policies = await PolicyDocument.find({ isActive: true }).sort({ createdAt: -1 });
    const signedPolicies = await Promise.all(
      policies.map(async (policy) => {
        const item = policy.toObject();
        item.fileUrl = await getSignedFileUrl(item);
        return item;
      })
    );
    res.json(signedPolicies);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch policies" });
  }
};

export const uploadPolicy = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "File is required" });
    }

    const storedFile = await storeUploadedFile({
      file: req.file,
      folder: "policies",
      preferS3: true
    });

    const policy = await PolicyDocument.create({
      title: req.body.title,
      category: req.body.category,
      description: req.body.description || "",
      filePath: storedFile.filePath,
      fileUrl: storedFile.fileUrl,
      storage: storedFile.storage,
      uploadedBy: req.user._id
    });

    res.status(201).json(policy);

    // Auto-announce the new/updated policy so staff are notified of the change.
    Announcement.create({
      title: `New policy: ${policy.title}`,
      message: policy.description
        ? `A policy document "${policy.title}" has been published/updated. ${policy.description}`
        : `A policy document "${policy.title}" has been published/updated. Please review it in the Policies section.`,
      category: "HR_NOTIFICATION",
      audience: "ALL",
      publishedBy: req.user._id
    }).catch((e) => console.error("Policy announcement failed:", e.message));

    logActivity({
      req,
      action: "CREATE",
      module: "ANNOUNCEMENTS",
      description: `Policy "${policy.title}" published`,
      targetId: policy._id,
      targetName: policy.title,
      metadata: { category: policy.category }
    }).catch(() => {});
  } catch (error) {
    res.status(500).json({ message: "Failed to upload policy" });
  }
};

export const deletePolicy = async (req, res) => {
  try {
    const policy = await PolicyDocument.findById(req.params.id);
    if (!policy) {
      return res.status(404).json({ message: "Policy not found" });
    }
    deleteStoredFile(policy.filePath, policy.storage);
    await PolicyDocument.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete policy" });
  }
};
