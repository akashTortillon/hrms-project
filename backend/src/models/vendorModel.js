import mongoose from "mongoose";

const vendorSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        status: {
            type: String,
            default: "Active",
        },
    },
    { timestamps: true }
);

export default mongoose.model("Vendor", vendorSchema);
