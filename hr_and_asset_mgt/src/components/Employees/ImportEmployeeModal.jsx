import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { importEmployees } from "../../services/employeeService";
import SvgIcon from "../svgIcon/svgView.jsx";

const ImportEmployeeModal = ({ isOpen, onClose, onSuccess }) => {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");
    const [dragActive, setDragActive] = useState(false);
    const inputRef = useRef(null);

    if (!isOpen) return null;

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setResult(null);
            setError("");
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile.name.match(/\.(xlsx|xls|csv)$/)) {
                setFile(droppedFile);
                setResult(null);
                setError("");
            } else {
                setError("Invalid file type. Please upload Excel or CSV.");
            }
        }
    };

    const handleDownloadTemplate = () => {
        const templateData = [
            {
                "Full Name": "Ahmed Al Mansoori",
                "COMPANY / BRANCH": "RIZAN HEAD OFFICE",
                "WORK LOCATION": "",
                "VISA LOCATION": "",
                "work permit": "",
                "Role": "Employee",
                "Department": "Sales & Operations",
                "Designation": "Sales Executive",
                "Email": "ahmed.almansoori@company.com",
                "Contact Number": "971501234567",
                "Status": "Active",
                "Shift": "Morning",
                "Joining Date": "2024-03-01",
                "Employee Type": "Full-Time",
                "Agent ID (WPS)": "",
                "Basic Salary (AED)": 5000,
                "Allowance (AED)": 1500,
                "HRA (AED)": 500,
                "Total Salary (AED)": 7000,
                "ACCOMODATION ALLOWANCE": 0,
                "VEHICHLE ALLOWANCE": 0,
                "MONTHLY CTC": 7000,
                "Date of Birth": "1992-06-15",
                "Personal ID (14 Digit)": "78419921234567",
                "Nationality": "UAE",
                "Accommodation": "Self",
                "UAE Address": "Al Nahda, Dubai, UAE",
                "Passport No": "A1234567",
                "Passport Expiry": "2029-06-15",
                "Emirates ID No": "784-1992-1234567-1",
                "Emirates ID Expiry": "2027-06-15",
                "Visa No": "201/2024/1234567",
                "Visa File No": "202/2024/1234",
                "Bank Name": "Emirates NBD",
                "IBAN": "AE070260001015779902601",
                "Account Number": "1012345678"
            }
        ];
        const worksheet = XLSX.utils.json_to_sheet(templateData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");
        XLSX.writeFile(workbook, "Employee_Import_Template.xlsx");
    };

    const handleUpload = async () => {
        if (!file) {
            setError("Please select a file first.");
            return;
        }

        setLoading(true);
        setError("");
        setResult(null);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await importEmployees(formData);
            setResult(response);
            if (response && response.successCount > 0) {
                if (onSuccess) onSuccess();
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || "Import failed. Please check your file.");
        } finally {
            setLoading(false);
        }
    };

    const onButtonClick = () => {
        inputRef.current.click();
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: "550px" }}>
                <div className="modal-header">
                    <h3>
                        <div style={{ background: '#eff6ff', padding: '8px', borderRadius: '8px', display: 'flex', color: '#2563eb' }}>
                            <SvgIcon name="upload" size={20} className="svg-icon-blue-filter" />
                        </div>
                        Bulk Import Employees
                    </h3>
                    <button className="close-btn" onClick={onClose}><SvgIcon name="close" size={18} /></button>
                </div>

                <div className="modal-body">
                    {/* Step 1: Download Template */}
                    <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #f3f4f6' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#1f2937' }}>Step 1: Get the Template</h4>
                                <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>Download formatted Excel file</p>
                                <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#9ca3af' }}>
                                    COMPANY / BRANCH (e.g. "RIZAN HEAD OFFICE") is split by matching a known Company name.
                                    Department/Designation/Role/Employee Type must match Masters exactly.
                                    WORK LOCATION and VISA LOCATION are the Company's Code ID (set under Masters → Companies).
                                </p>
                            </div>
                            <button
                                className="btn-secondary btn-sm"
                                onClick={handleDownloadTemplate}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '36px' }}
                            >
                                <SvgIcon name="download" size={14} /> Download
                            </button>
                        </div>
                    </div>

                    {/* Step 2: Upload Area */}
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#1f2937' }}>Step 2: Upload File</h4>

                    {!result ? (
                        <div
                            className={`upload-dropzone ${dragActive ? 'active' : ''}`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            onClick={onButtonClick}
                        >
                            <input
                                ref={inputRef}
                                type="file"
                                accept=".xlsx, .xls, .csv"
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                            />

                            {file ? (
                                <div className="file-selected">
                                    <div className="file-icon">
                                        <SvgIcon name="document" size={24} />
                                    </div>
                                    <div className="file-info">
                                        <div className="file-name">{file.name}</div>
                                        <div className="file-size">{(file.size / 1024).toFixed(1)} KB</div>
                                    </div>
                                    <button
                                        className="remove-file-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setFile(null);
                                        }}
                                    >
                                        <SvgIcon name="close" size={14} />
                                    </button>
                                </div>
                            ) : (
                                <div className="upload-placeholder">
                                    <div className="upload-icon-wrapper">
                                        <SvgIcon name="upload" size={24} />
                                    </div>
                                    <p className="upload-text">
                                        <span className="upload-link">Click to upload</span> or drag and drop
                                    </p>
                                    <p className="upload-hint">Excel or CSV files only</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        // Result View
                        <div className="import-result-container">
                            <div className="result-summary">
                                <div className="result-item success">
                                    <div className="result-icon">
                                        <SvgIcon name="circle-tick" size={20} />
                                    </div>
                                    <div>
                                        <div className="result-label">Successful</div>
                                        <div className="result-value">{result.successCount}</div>
                                    </div>
                                </div>
                                <div className="result-item error">
                                    <div className="result-icon">
                                        <SvgIcon name="exclamation" size={20} />
                                    </div>
                                    <div>
                                        <div className="result-label">Failed</div>
                                        <div className="result-value">{result.failureCount}</div>
                                    </div>
                                </div>
                            </div>

                            {result.summary?.length > 0 && (
                                <div className="error-list" style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                                    <h5 style={{ margin: '0 0 8px 0' }}>Fix these master data gaps, then re-upload</h5>
                                    <ul>
                                        {result.summary.map((msg, idx) => (
                                            <li key={idx}>{msg}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {result.failureCount > 0 && (
                                <div className="error-list">
                                    <h5>Error Details</h5>
                                    <ul>
                                        {result.errors.map((err, idx) => (
                                            <li key={idx}>
                                                <span className="error-row">Row {err.row}:</span> {err.message}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {error && (
                        <div className="error-alert">
                            <SvgIcon name="exclamation" size={16} />
                            {error}
                        </div>
                    )}

                    <div className="form-actions">
                        <button className="btn-secondary" onClick={onClose}>Close</button>
                        {(!result || result.failureCount > 0) && (
                            <button
                                className="btn-primary"
                                onClick={handleUpload}
                                disabled={loading || !file}
                                style={{ minWidth: '120px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                            >
                                {loading ? (
                                    <>Processing...</>
                                ) : (
                                    <>
                                        <SvgIcon name="upload" size={16} style={{ color: 'white' }} />
                                        {result ? "Retry Import" : "Import Employees"}
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImportEmployeeModal;
