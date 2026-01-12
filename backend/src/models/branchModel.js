import mongoose from "mongoose";

const branchSchema = new mongoose.Schema({
    name: { type: String, required: true },
    location: { type: String }, // Optional location field
    status: {
        type: String,
        enum: ["Active", "Inactive"],
        default: "Active"
    }
}, { timestamps: true });

export default mongoose.model("Branch", branchSchema);
