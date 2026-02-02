import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
    {
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        title: {
            type: String,
            required: true,
        },
        message: {
            type: String,
        },
        type: {
            type: String,
            enum: ["REQUEST", "EXPIRY", "INFO", "SYSTEM"],
            default: "INFO",
        },
        isRead: {
            type: Boolean,
            default: false,
        },
        link: {
            type: String,
        },
    },
    { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);
