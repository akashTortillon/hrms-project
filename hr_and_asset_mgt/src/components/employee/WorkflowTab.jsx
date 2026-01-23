import { useState, useEffect } from "react";
import { getEmployeeWorkflow, updateWorkflowItem, addItemToWorkflow } from "../../services/workflowService";
import { toast } from "react-toastify";
import Button from "../reusable/Button";
import SvgIcon from "../svgIcon/svgView";
import "../../style/Workflow.css"; // We will create this style next

const WorkflowTab = ({ employeeId, type }) => {
    const [workflow, setWorkflow] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploadingId, setUploadingId] = useState(null);

    useEffect(() => {
        fetchWorkflow();
    }, [employeeId, type]);

    const fetchWorkflow = async () => {
        try {
            setLoading(true);
            const res = await getEmployeeWorkflow(employeeId, type);
            if (res.success) {
                setWorkflow(res.data);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load workflow");
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (itemId, file) => {
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        try {
            setUploadingId(itemId);
            const res = await updateWorkflowItem(workflow._id, itemId, formData);
            if (res.success) {
                setWorkflow(res.data);
                toast.success("Document uploaded successfully");
            }
        } catch (error) {
            toast.error("Upload failed");
        } finally {
            setUploadingId(null);
        }
    };

    const handleStatusToggle = async (itemId, currentStatus) => {
        // Allow Admin to manually toggle complete/incomplete
        const newStatus = currentStatus === "Completed" ? "Pending" : "Completed";
        try {
            const res = await updateWorkflowItem(workflow._id, itemId, { status: newStatus });
            if (res.success) {
                setWorkflow(res.data);
                toast.success("Status updated");
            }
        } catch (error) {
            toast.error("Update failed");
        }
    };

    if (loading) return <div>Loading checklist...</div>;
    if (!workflow) return <div>No workflow found.</div>;

    const completedCount = workflow.items.filter(i => i.status === "Completed").length;
    const progress = Math.round((completedCount / workflow.items.length) * 100);

    return (
        <div className="workflow-container">
            {/* Header */}
            <div className="workflow-header">
                <h3>{type} Checklist</h3>
                <div className="workflow-progress">
                    <span>{progress}% Completed</span>
                    <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${progress}%`, backgroundColor: progress === 100 ? '#22c55e' : '#3b82f6' }}></div>
                    </div>
                </div>
            </div>

            {/* Add Item Section */}
            <div className="add-item-section" style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
                <input
                    type="text"
                    placeholder="Add custom item..."
                    className="add-item-input"
                    onKeyDown={async (e) => {
                        if (e.key === 'Enter' && e.target.value.trim()) {
                            try {
                                const res = await addItemToWorkflow(workflow._id, e.target.value.trim());
                                if (res.success) {
                                    setWorkflow(res.data);
                                    toast.success("Item added");
                                    e.target.value = '';
                                }
                            } catch (err) {
                                toast.error("Failed to add item");
                            }
                        }
                    }}
                    style={{
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        flex: 1
                    }}
                />
            </div>

            {/* Checklist Items */}
            <div className="workflow-list">
                {workflow.items.map((item) => (
                    <div key={item._id} className={`workflow-item ${item.status === 'Completed' ? 'completed' : ''}`}>
                        <div className="item-info">
                            <div className="item-status-icon">
                                {item.status === "Completed" ? (
                                    <SvgIcon name="circle-tick" size={20} color="#22c55e" />
                                ) : (
                                    <div className="pending-circle"></div>
                                )}
                            </div>
                            <div>
                                <h4 className="item-name">{item.name}</h4>
                                <p className="item-desc">{item.description}</p>
                            </div>
                        </div>

                        <div className="item-actions">
                            {/* File Link if Uploaded */}
                            {item.documentUrl && (
                                <a
                                    href={`${import.meta.env.VITE_API_BASE || "http://localhost:5000"}${item.documentUrl}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="view-doc-link"
                                >
                                    <SvgIcon name="document" size={16} /> View Doc
                                </a>
                            )}

                            {/* Upload Button */}
                            <label className="upload-btn-label">
                                {uploadingId === item._id ? "Uploading..." : (item.documentUrl ? "Replace" : "Upload")}
                                <input
                                    type="file"
                                    hidden
                                    onChange={(e) => handleFileUpload(item._id, e.target.files[0])}
                                />
                            </label>

                            {/* Toggle Status (Admin/HR Only - implicitly allowed here since tab is restricted) */}
                            <button
                                className="toggle-status-btn"
                                onClick={() => handleStatusToggle(item._id, item.status)}
                                title={item.status === "Completed" ? "Mark as Pending" : "Mark as Completed"}
                            >
                                <SvgIcon name={item.status === "Completed" ? "circle-xmark" : "circle-tick"} size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WorkflowTab;
