import mongoose from "mongoose";

const documentTypeSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    status: {
        type: String,
        enum: ["Active", "Inactive"],
        default: "Active"
    }
}, { timestamps: true });

export default mongoose.model("DocumentType", documentTypeSchema);
