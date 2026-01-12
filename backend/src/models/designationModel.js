import mongoose from "mongoose";

const designationSchema = new mongoose.Schema({
    name: { type: String, required: true },
    status: {
        type: String,
        enum: ["Active", "Inactive"],
        default: "Active"
    }
}, { timestamps: true });

export default mongoose.model("Designation", designationSchema);
