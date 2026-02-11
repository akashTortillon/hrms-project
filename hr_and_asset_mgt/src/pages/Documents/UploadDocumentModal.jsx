import React, { useState, useEffect } from "react";
import "../../style/UploadDocumentModal.css";
import CustomSelect from "../../components/reusable/CustomSelect";
import CustomDatePicker from "../../components/reusable/CustomDatePicker";

import { getBranches, companyDocumentTypeService } from "../../services/masterService";
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
    const [docTypes, setDocTypes] = useState([]);

    useEffect(() => {
        loadMasters();
    }, []);

    const loadMasters = async () => {
        try {
            const [branchesData, typesData] = await Promise.all([
                getBranches(),
                companyDocumentTypeService.getAll()
            ]);
            setBranches(branchesData);
            setDocTypes(typesData);
        } catch (err) {
            console.error("Failed to load form data", err);
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
        if (!form.name || !form.file || !form.type) {
            alert("Name, Type and File are required!");
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
                            <label className="input-label">Company Document Type</label>
                            <CustomSelect
                                name="type"
                                placeholder="Select Type"
                                value={form.type}
                                onChange={(value) =>
                                setForm(prev => ({ ...prev, type: value }))
                                }
                                options={docTypes.map(type => ({
                                value: type.name,
                                label: type.name
                                }))}
                            />
                        </div>

                        <div className="input-wrapper">
                            <label className="input-label">Location / Branch</label>
                            <CustomSelect
                                name="location"
                                placeholder="Select Location"
                                value={form.location}
                                onChange={(value) =>
                                setForm(prev => ({ ...prev, location: value }))
                                }
                                options={branches.map(b => ({
                                value: b.name,
                                label: b.name
                                }))}
                            />
                        </div>

                        <div className="input-wrapper">
                            <label className="input-label">Issue Date (Optional)</label>
                            <CustomDatePicker
                                value={form.issueDate}
                                placeholder="Select Issue Date"
                                onChange={(date) =>
                                setForm(prev => ({ ...prev, issueDate: date }))
                                }
                            />
                        </div>

                        <div className="input-wrapper">
                            <label className="input-label">Expiry Date</label>
                            <CustomDatePicker
                                value={form.expiryDate}
                                placeholder="Select Expiry Date"
                                onChange={(date) =>
                                setForm(prev => ({ ...prev, expiryDate: date }))
                                }
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
