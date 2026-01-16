import mongoose from "mongoose";

const trainingSchema = new mongoose.Schema(
    {
        employee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
            required: true
        },
        title: {
            type: String,
            required: true
        },
        date: {
            type: Date,
            required: true
        },
        score: {
            type: String, // e.g., "95%"
            default: "N/A"
        },
        status: {
            type: String,
            enum: ["Completed", "In Progress", "Pending", "Failed"],
            default: "Completed"
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.model("EmployeeTraining", trainingSchema);
