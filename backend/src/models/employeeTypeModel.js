import mongoose from "mongoose";

const employeeTypeSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    status: {
        type: String,
        enum: ["Active", "Inactive"],
        default: "Active"
    }
}, { timestamps: true });

export default mongoose.model("EmployeeType", employeeTypeSchema);
