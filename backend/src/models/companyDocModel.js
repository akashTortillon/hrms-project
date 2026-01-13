import mongoose from "mongoose";

const companyDocSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, required: true }, // License, Tax, Insurance
    location: { type: String }, // e.g. "Main Office"
    issueDate: { type: Date },
    expiryDate: { type: Date, required: true },
    filePath: { type: String, required: true }, // saved filename
    status: {
        type: String,
        enum: ["Valid", "Expiring Soon", "Expired"],
        default: "Valid"
    },
    uploadedAt: { type: Date, default: Date.now }
}, { timestamps: true });



export default mongoose.model("CompanyDocument", companyDocSchema);
