import mongoose from "mongoose";

const employeeDocumentSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    documentType: { type: String, required: true }, // e.g., "Passport", "Emirates ID"
    documentNumber: { type: String }, // Optional reference number
    expiryDate: { type: Date },
    filePath: { type: String, required: true }, // Path to stored file
    status: {
        type: String,
        enum: ["Valid", "Expiring Soon", "Expired"],
        default: "Valid"
    },
    uploadedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Pre-save hook to calculate status? 
// Or just calculate it on fetch. Let's calculate on fetch or frontend to keep DB simple?
// Actually, user might want to query by status later.
// Let's keep it simple for now and calculate status on frontend like the screenshot shows (green badge).

export default mongoose.model("EmployeeDocument", employeeDocumentSchema);
