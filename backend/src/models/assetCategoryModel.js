import mongoose from "mongoose";

const assetCategorySchema = new mongoose.Schema(
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

export default mongoose.model("AssetCategory", assetCategorySchema);
