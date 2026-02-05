import React, { useState, useEffect } from "react";
import { documentTypeService } from "../../services/masterService";
import "../../style/AddEmployeeModal.css"; // Reuse existing styles
import CustomSelect from "../../components/reusable/CustomSelect";

export default function UploadEmployeeDocumentModal({ onClose, onUpload, employeeId }) {
    const [form, setForm] = useState({
        documentType: "",
        documentNumber: "",
        expiryDate: "",
        file: null
    });
    const [docTypes, setDocTypes] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchDocTypes();
    }, []);

    const fetchDocTypes = async () => {
        try {
            const data = await documentTypeService.getAll();
            setDocTypes(data);
        } catch (error) {
            console.error("Failed to fetch doc types", error);
        }
    };

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        setForm({ ...form, file: e.target.files[0] });
    };

    const handleSubmit = () => {
        if (!form.documentType || !form.file) {
            alert("Document Type and File are required");
            return;
        }

        setLoading(true);
        const formData = new FormData();
        formData.append("employeeId", employeeId);
        formData.append("documentType", form.documentType);
        formData.append("documentNumber", form.documentNumber);
        if (form.expiryDate) formData.append("expiryDate", form.expiryDate);
        formData.append("file", form.file);

        onUpload(formData).finally(() => setLoading(false));
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Upload Document</h3>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                <div className="modal-body">
                    <div className="modal-grid">
                        <div className="form-group">
                            <label>Document Type</label>
                            <CustomSelect
                                name="documentType"
                                value={form.documentType}
                                onChange={(val) => handleChange({ target: { name: 'documentType', value: val } })}
                                options={[
                                    { value: "", label: "Select Type" },
                                    ...docTypes.map(dt => ({ value: dt.name, label: dt.name }))
                                ]}
                                placeholder="Select Type"
                            />
                        </div>

                        <div className="form-group">
                            <label>Document Number (Optional)</label>
                            <input name="documentNumber" placeholder="e.g. P1234567" onChange={handleChange} />
                        </div>

                        <div className="form-group">
                            <label>Expiry Date (Optional)</label>
                            <input type="date" name="expiryDate" onChange={handleChange} />
                        </div>

                        <div className="form-group">
                            <label>File</label>
                            <div className="file-input-wrapper" style={{ border: '1px dashed #ccc', padding: '20px', textAlign: 'center', borderRadius: '8px' }}>
                                <input type="file" onChange={handleFileChange} />
                                {form.file && <div style={{ fontSize: '12px', marginTop: '5px', color: 'green' }}>Selected: {form.file.name}</div>}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
                        {loading ? "Uploading..." : "Upload Document"}
                    </button>
                </div>
            </div>
        </div>
    );
}
