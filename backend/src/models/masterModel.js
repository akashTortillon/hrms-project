import mongoose from "mongoose";

const unifiedMasterSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        index: true,
        uppercase: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    code: {
        type: String,
        trim: true
    },
    description: { type: String },
    isActive: {
        type: Boolean,
        default: true
    },
    metadata: { type: mongoose.Schema.Types.Mixed }, // Flexible JSON field
    assetTypeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Master',
        index: true
    },
    permissions: {
        type: [String],
        default: []
    }
}, { timestamps: true });

// Compound index to ensure names are unique within a type
unifiedMasterSchema.index({ type: 1, name: 1 }, { unique: true });

export default mongoose.model("Master", unifiedMasterSchema);
