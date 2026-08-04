import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { previewShiftImport, applyShiftImport } from "../../services/employeeService";
import SvgIcon from "../svgIcon/svgView.jsx";

const ImportShiftModal = ({ isOpen, onClose, onSuccess }) => {
    const [file, setFile] = useState(null);
    const [step, setStep] = useState("upload"); // upload -> preview -> done
    const [preview, setPreview] = useState(null);
    const [applyResult, setApplyResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [dragActive, setDragActive] = useState(false);
    const inputRef = useRef(null);

    if (!isOpen) return null;

    const resetAll = () => {
        setFile(null);
        setStep("upload");
        setPreview(null);
        setApplyResult(null);
        setError("");
    };

    const handleClose = () => {
        resetAll();
        onClose();
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setPreview(null);
            setApplyResult(null);
            setStep("upload");
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
                setPreview(null);
                setApplyResult(null);
                setStep("upload");
                setError("");
            } else {
                setError("Invalid file type. Please upload Excel or CSV.");
            }
        }
    };

    const handleDownloadTemplate = () => {
        const templateData = [
            { "Employee Code": "EMP-SAMPLE-01", "Shift": "Morning" }
        ];
        const worksheet = XLSX.utils.json_to_sheet(templateData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Shifts");
        XLSX.writeFile(workbook, "Shift_Import_Template.xlsx");
    };

    const handlePreview = async () => {
        if (!file) {
            setError("Please select a file first.");
            return;
        }

        setLoading(true);
        setError("");

        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await previewShiftImport(formData);
            setPreview(response);
            setStep("preview");
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || "Preview failed. Please check your file.");
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async () => {
        if (!file) return;

        setLoading(true);
        setError("");

        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await applyShiftImport(formData);
            setApplyResult(response);
            setStep("done");
            if (response && response.updated > 0 && onSuccess) onSuccess();
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || "Import failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const onButtonClick = () => {
        inputRef.current.click();
    };

    const okCount = preview?.summary?.ok || 0;

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: "650px" }}>
                <div className="modal-header">
                    <h3>
                        <div style={{ background: '#eff6ff', padding: '8px', borderRadius: '8px', display: 'flex', color: '#2563eb' }}>
                            <SvgIcon name="upload" size={20} className="svg-icon-blue-filter" />
                        </div>
                        Bulk Import Shifts
                    </h3>
                    <button className="close-btn" onClick={handleClose}><SvgIcon name="close" size={18} /></button>
                </div>

                <div className="modal-body">
                    {step === "upload" && (
                        <>
                            <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #f3f4f6' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#1f2937' }}>Step 1: Get the Template</h4>
                                        <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>Download formatted Excel file</p>
                                        <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#9ca3af' }}>
                                            Columns: <strong>Employee Code</strong> (must match an existing employee's code)
                                            and <strong>Shift</strong> (must match a Shift under Masters exactly). Every row
                                            updates that employee's shift.
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

                            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#1f2937' }}>Step 2: Upload File</h4>

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
                        </>
                    )}

                    {step === "preview" && preview && (
                        <div className="import-result-container">
                            <div className="result-summary">
                                <div className="result-item success">
                                    <div className="result-icon">
                                        <SvgIcon name="circle-tick" size={20} />
                                    </div>
                                    <div>
                                        <div className="result-label">Will Update</div>
                                        <div className="result-value">{preview.summary.ok}</div>
                                    </div>
                                </div>
                                <div className="result-item error">
                                    <div className="result-icon">
                                        <SvgIcon name="exclamation" size={20} />
                                    </div>
                                    <div>
                                        <div className="result-label">Will Skip</div>
                                        <div className="result-value">{preview.summary.errors}</div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ maxHeight: '320px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                    <thead>
                                        <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
                                            <th style={{ padding: '8px 10px' }}>Row</th>
                                            <th style={{ padding: '8px 10px' }}>Code</th>
                                            <th style={{ padding: '8px 10px' }}>Employee</th>
                                            <th style={{ padding: '8px 10px' }}>Current → New Shift</th>
                                            <th style={{ padding: '8px 10px' }}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {preview.rows.map((r) => (
                                            <tr key={r.row} style={{ borderTop: '1px solid #f3f4f6' }}>
                                                <td style={{ padding: '8px 10px' }}>{r.row}</td>
                                                <td style={{ padding: '8px 10px' }}>{r.employeeCode}</td>
                                                <td style={{ padding: '8px 10px' }}>{r.employee ? r.employee.name : '—'}</td>
                                                <td style={{ padding: '8px 10px' }}>
                                                    {r.employee ? r.employee.currentShift : '—'} → {r.shiftName}
                                                </td>
                                                <td style={{ padding: '8px 10px' }}>
                                                    {r.status === 'ok' ? (
                                                        <span style={{ color: '#16a34a', fontWeight: 600 }}>Match</span>
                                                    ) : (
                                                        <span style={{ color: '#dc2626' }} title={r.message}>{r.message}</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {step === "done" && applyResult && (
                        <div className="import-result-container">
                            <div className="result-summary">
                                <div className="result-item success">
                                    <div className="result-icon">
                                        <SvgIcon name="circle-tick" size={20} />
                                    </div>
                                    <div>
                                        <div className="result-label">Updated</div>
                                        <div className="result-value">{applyResult.updated}</div>
                                    </div>
                                </div>
                                <div className="result-item error">
                                    <div className="result-icon">
                                        <SvgIcon name="exclamation" size={20} />
                                    </div>
                                    <div>
                                        <div className="result-label">Skipped</div>
                                        <div className="result-value">{applyResult.skipped}</div>
                                    </div>
                                </div>
                            </div>

                            {applyResult.skipped > 0 && (
                                <div className="error-list">
                                    <h5>Skipped Rows</h5>
                                    <ul>
                                        {applyResult.errors.map((err, idx) => (
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
                        <button className="btn-secondary" onClick={handleClose}>Close</button>

                        {step === "upload" && (
                            <button
                                className="btn-primary"
                                onClick={handlePreview}
                                disabled={loading || !file}
                                style={{ minWidth: '120px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                            >
                                {loading ? "Processing..." : "Preview"}
                            </button>
                        )}

                        {step === "preview" && (
                            <>
                                <button className="btn-secondary" onClick={resetAll}>Back</button>
                                <button
                                    className="btn-primary"
                                    onClick={handleConfirm}
                                    disabled={loading || okCount === 0}
                                    style={{ minWidth: '140px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                                >
                                    {loading ? "Importing..." : `Confirm Import (${okCount})`}
                                </button>
                            </>
                        )}

                        {step === "done" && (
                            <button className="btn-secondary" onClick={resetAll}>Import Another File</button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImportShiftModal;
