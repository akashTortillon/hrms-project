import React, { useState } from "react";
import "../../style/UploadDocumentModal.css";

export default function ReplaceDocumentModal({ doc, onClose, onReplace }) {
    const [form, setForm] = useState({
        expiryDate: doc?.expiryDate || "",
        file: null,
        note: ""
    });

    const handleChange = (e) => {
        if (e.target.name === "file") {
            setForm({ ...form, file: e.target.files[0] });
        } else {
            setForm({ ...form, [e.target.name]: e.target.value });
        }
    };

    const handleSubmit = () => {
        if (!form.file) {
            alert("Please select a new file!");
            return;
        }

        const formData = new FormData();
        formData.append("file", form.file);
        if (form.expiryDate) formData.append("expiryDate", form.expiryDate);
        formData.append("note", form.note || "Updated via Replace");

        onReplace(doc._id || doc.id, formData);
    };

    return (
        <div className="upload-docs-modal-backdrop" onClick={onClose}>
            <div className="upload-docs-modal-container" onClick={(e) => e.stopPropagation()}>
                <div className="upload-docs-modal-header">
                    <h3>Replace Document Version</h3>
                    <button className="upload-docs-modal-close" onClick={onClose}>✕</button>
                </div>

                <div className="upload-docs-modal-body">
                    <p style={{ marginBottom: 20, color: "#4b5563" }}>
                        Replacing: <strong>{doc?.title || doc?.name}</strong>. Previous version will be archived.
                    </p>

                    <div className="upload-docs-grid">
                        <div className="input-wrapper">
                            <label className="input-label">New Expiry Date (Optional)</label>
                            <input
                                name="expiryDate"
                                type="date"
                                value={form.expiryDate}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="input-wrapper">
                            <label className="input-label">Update Note (Audit Trail)</label>
                            <input
                                name="note"
                                placeholder="e.g. Renewed for 2024"
                                value={form.note}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="file-upload-wrapper">
                            <label className="input-label" style={{ marginBottom: 8, display: 'block' }}>Upload New File (PDF/Image)</label>
                            <input
                                name="file"
                                type="file"
                                accept=".pdf,.jpg,.png"
                                onChange={handleChange}
                                style={{ border: 'none', background: 'transparent', padding: 0 }}
                            />
                        </div>
                    </div>
                </div>

                <div className="upload-docs-modal-footer">
                    <button className="btn-upload-cancel" onClick={onClose}>Cancel</button>
                    <button className="btn-upload-primary" onClick={handleSubmit}>
                        Confirm Replacement
                    </button>
                </div>
            </div>
        </div>
    );
}
