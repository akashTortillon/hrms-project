import mongoose from "mongoose";

const employeeDocumentSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    documentType: { type: String, required: true }, // e.g., "Passport", "Emirates ID"
    label: { type: String, default: "" }, // Optional distinct name to tell same-type re-uploads apart
    documentNumber: { type: String }, // Optional reference number
    expiryDate: { type: Date },
    filePath: { type: String, required: true }, // Path to stored file
    fileUrl: { type: String, default: "" },
    storage: {
        type: String,
        enum: ["LOCAL", "S3"],
        default: "LOCAL"
    },
    status: {
        type: String,
        enum: ["Valid", "Expiring Soon", "Expired"],
        default: "Valid"
    },
    // Set false when a newer document of the same employeeId+documentType is uploaded,
    // so stale/expired prior uploads stop surfacing on the Dashboard and Documents tab
    // once superseded. Missing on documents created before this field existed - those
    // are treated as active (see the `{ isActive: { $ne: false } }` read-side filters).
    isActive: { type: Boolean, default: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    uploadedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Pre-save hook to calculate status? 
// Or just calculate it on fetch. Let's calculate on fetch or frontend to keep DB simple?
// Actually, user might want to query by status later.
// Let's keep it simple for now and calculate status on frontend like the screenshot shows (green badge).

export default mongoose.model("EmployeeDocument", employeeDocumentSchema);
