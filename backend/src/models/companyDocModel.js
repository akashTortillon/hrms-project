import mongoose from "mongoose";

const companyDocSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, required: true }, // License, Tax, Insurance
    location: { type: String }, // e.g. "Main Office"
    issueDate: { type: Date },
    expiryDate: { type: Date }, // Optional now
    filePath: { type: String, required: true }, // saved filename
    status: {
        type: String,
        enum: ["Valid", "Expiring Soon", "Expired", "Critical"],
        default: "Valid"
    },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    uploaderRole: { type: String }, // e.g. "Admin", "HR"
    uploadedAt: { type: Date, default: Date.now }
}, { timestamps: true });



export default mongoose.model("CompanyDocument", companyDocSchema);
