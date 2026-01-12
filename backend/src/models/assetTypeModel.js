import mongoose from "mongoose";

const assetTypeSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        status: {
            type: String,
            default: "Active",
        },
    },
    { timestamps: true }
);

export default mongoose.model("AssetType", assetTypeSchema);
