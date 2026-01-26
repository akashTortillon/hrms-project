import mongoose from "mongoose";

const workflowItemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    status: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' },
    documentUrl: { type: String }, // URL of uploaded doc if applicable
    required: { type: Boolean, default: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedAt: { type: Date }
});

const workflowSchema = new mongoose.Schema({
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    type: { type: String, enum: ['Onboarding', 'Offboarding'], required: true },
    status: { type: String, enum: ['In Progress', 'Completed'], default: 'In Progress' },
    items: [workflowItemSchema], // The checklist
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    completedAt: { type: Date }
}, { timestamps: true });

// Prevent duplicate active workflows of same type for an employee
workflowSchema.index({ employee: 1, type: 1 }, { unique: true });

export default mongoose.model("Workflow", workflowSchema);
