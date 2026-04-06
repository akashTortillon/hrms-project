import PolicyDocument from "../models/policyDocumentModel.js";
import { deleteStoredFile, storeUploadedFile } from "../utils/storage.js";

export const getPolicies = async (req, res) => {
  try {
    const policies = await PolicyDocument.find({ isActive: true }).sort({ createdAt: -1 });
    res.json(policies);
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
      preferS3: false
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
