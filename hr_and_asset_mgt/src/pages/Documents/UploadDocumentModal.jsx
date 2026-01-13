import React, { useState, useEffect } from "react";
import "../../style/UploadDocumentModal.css";
import { getBranches } from "../../services/masterService";
import { toast } from "react-toastify";

export default function UploadDocumentModal({ onClose, onUpload }) {
    const [form, setForm] = useState({
        name: "",
        type: "",
        location: "",
        issueDate: "",
        expiryDate: "",
        file: null,
    });

    const [branches, setBranches] = useState([]);

    useEffect(() => {
        loadBranches();
    }, []);

    const loadBranches = async () => {
        try {
            const data = await getBranches();
            setBranches(data);
        } catch (err) {
            console.error("Failed to load branches", err);
            // Fallback or silent fail
        }
    };

    const handleChange = (e) => {
        if (e.target.name === "file") {
            setForm({ ...form, file: e.target.files[0] });
        } else {
            setForm({ ...form, [e.target.name]: e.target.value });
        }
    };

    const handleSubmit = () => {
        if (!form.name || !form.expiryDate || !form.file) {
            alert("Name, Expiry Date and File are required!");
            return;
        }

        const formData = new FormData();
        formData.append("name", form.name);
        formData.append("type", form.type);
        formData.append("location", form.location);
        formData.append("issueDate", form.issueDate);
        formData.append("expiryDate", form.expiryDate);
        formData.append("file", form.file);

        onUpload(formData);
    };

    return (
        <div className="upload-docs-modal-backdrop" onClick={onClose}>
            <div className="upload-docs-modal-container" onClick={(e) => e.stopPropagation()}>
                <div className="upload-docs-modal-header">
                    <h3>Upload Company Document</h3>
                    <button className="upload-docs-modal-close" onClick={onClose}>✕</button>
                </div>

                <div className="upload-docs-modal-body">
                    <div className="upload-docs-grid">

                        <div className="input-wrapper">
                            <label className="input-label">Document Name</label>
                            <input
                                name="name"
                                placeholder="e.g. Trade License"
                                value={form.name}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="input-wrapper">
                            <label className="input-label">Description / Subtitle</label>
                            <input
                                name="type"
                                placeholder="e.g. Main Office License"
                                value={form.type}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="input-wrapper">
                            <label className="input-label">Location / Branch</label>
                            <select
                                name="location"
                                value={form.location}
                                onChange={handleChange}
                            >
                                <option value="">Select Location</option>
                                {branches.map(b => (
                                    <option key={b._id} value={b.name}>{b.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Empty spacer div to align dates on new row if needed, or just let grid flow */}
                        {/* Grid is 2 columns. 3 items above. Next item "Issue Date" will be 2nd row right? No.
                Item 1: Name, Item 2: Desc
                Item 3: Location, Item 4: Issue Date
                Item 5: Expiry, Item 6: File (span 2)
            */}

                        <div className="input-wrapper">
                            <label className="input-label">Issue Date (Optional)</label>
                            <input
                                name="issueDate"
                                type="date"
                                value={form.issueDate}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="input-wrapper">
                            <label className="input-label">Expiry Date <span style={{ color: 'red' }}>*</span></label>
                            <input
                                name="expiryDate"
                                type="date"
                                value={form.expiryDate}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="file-upload-wrapper">
                            <label className="input-label" style={{ marginBottom: 8, display: 'block' }}>Upload File (PDF/Image)</label>
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
                        Upload Document
                    </button>
                </div>
            </div>
        </div>
    );
}
