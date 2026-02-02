import React, { useState } from "react";
import AppButton from "../../components/reusable/Button";
import SvgIcon from "../../components/svgIcon/svgView";
import * as XLSX from "xlsx";
import "../../style/AddEmployeeModal.css"; // Reusing modal styles

export default function BulkImportModal({ onClose, onImport }) {
    const [file, setFile] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // Generate and Download Template on the fly
    const handleDownloadTemplate = () => {
        // 5 Static Sample Assets specific to client needs
        const sampleData = [
            {
                "Asset Name": "Dell Latitude 5420",
                "Category": "Laptops",
                "Type": "IT Equipment",
                "Serial Number": "DL-X892-001",
                "Purchase Cost": 4500,
                "Purchase Date": "2024-01-15",
                "Location": "Dubai Office",
                "Sub Location": "IT Storeroom",
                "Warranty (Months)": 12
            },
            {
                "Asset Name": "Office Chair Ergonomic",
                "Category": "Furniture",
                "Type": "Office Furniture",
                "Serial Number": "FURN-CH-202",
                "Purchase Cost": 850,
                "Purchase Date": "2024-02-10",
                "Location": "RAK Branch",
                "Sub Location": "Main Hall",
                "Warranty (Months)": 12
            },
            {
                "Asset Name": "Canon Printer",
                "Category": "Printers",
                "Type": "IT Equipment",
                "Serial Number": "CN-PRT-554",
                "Purchase Cost": 2100,
                "Purchase Date": "2024-03-01",
                "Location": "Dubai Office",
                "Sub Location": "Reception",
                "Warranty (Months)": 24
            },
            {
                "Asset Name": "Samsung Monitor 27",
                "Category": "Monitors",
                "Type": "IT Equipment",
                "Serial Number": "SAM-MON-778",
                "Purchase Cost": 1200,
                "Purchase Date": "2024-01-20",
                "Location": "Dubai Office",
                "Sub Location": "Sales Dept",
                "Warranty (Months)": 24
            },
            {
                "Asset Name": "Toyota Corolla",
                "Category": "Vehicles",
                "Type": "Transportation",
                "Serial Number": "TYT-COR-997",
                "Purchase Cost": 75000,
                "Purchase Date": "2023-11-15",
                "Location": "Main Parking",
                "Sub Location": "Slot 4B",
                "Warranty (Months)": 36
            }
        ];

        const worksheet = XLSX.utils.json_to_sheet(sampleData);

        // Auto-width columns for better UX
        const wscols = [
            { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 }
        ];
        worksheet["!cols"] = wscols;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Asset_Template");
        XLSX.writeFile(workbook, "Asset_Import_Template.xlsx");
    };

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        if (selected) {
            if (
                selected.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
                selected.type === "application/vnd.ms-excel" ||
                selected.type === "text/csv" ||
                selected.name.endsWith(".xlsx") ||
                selected.name.endsWith(".csv")
            ) {
                setFile(selected);
                setError("");
            } else {
                setFile(null);
                setError("Please upload a valid Excel (.xlsx) or CSV file.");
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            setError("Please select a file first.");
            return;
        }

        setLoading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            await onImport(formData);
            onClose(); // Close on success
        } catch (err) {
            // Error handling is done in parent, but we stop loading here
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="add-employee-overlay">
            <div className="add-employee-modal" style={{ maxWidth: "500px", padding: "30px" }}>
                <div className="modal-header">
                    <h2>Bulk Import Assets</h2>
                    <button className="close-btn" onClick={onClose} disabled={loading}>
                        <SvgIcon name="circle-xmark" size={24} />
                    </button>
                </div>

                <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

                    <div style={{ background: "#f8fafc", padding: "15px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                        <h4 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#475569" }}>Step 1: Download Template</h4>
                        <p style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.5" }}>
                            Download the standard Excel template. It includes 5 sample assets.
                            Fill your data in the same format.
                        </p>
                        <button
                            type="button"
                            onClick={handleDownloadTemplate}
                            style={{
                                marginTop: "10px",
                                background: "#0f172a",
                                color: "white",
                                border: "none",
                                padding: "8px 16px",
                                borderRadius: "6px",
                                fontWeight: "500",
                                fontSize: "13px",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "8px"
                            }}
                        >
                            <SvgIcon name="download" size={16} color="white" /> Download Template
                        </button>
                    </div>

                    <div style={{ background: "#fff", padding: "15px", borderRadius: "8px", border: "1px dashed #cbd5e1" }}>
                        <h4 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#475569" }}>Step 2: Upload Files</h4>
                        <input
                            type="file"
                            accept=".xlsx, .xls, .csv"
                            onChange={handleFileChange}
                            style={{ fontSize: "14px" }}
                        />
                        {error && <div style={{ color: "red", fontSize: "13px", marginTop: "8px" }}>{error}</div>}
                    </div>

                </div>

                <div className="modal-actions" style={{ justifyContent: "flex-end", marginTop: "20px" }}>
                    <AppButton
                        variant="secondary"
                        onClick={onClose}
                        disabled={loading}
                    >
                        Cancel
                    </AppButton>
                    <AppButton
                        variant="primary"
                        onClick={handleSubmit}
                        disabled={!file || loading}
                        style={{ minWidth: "120px" }}
                    >
                        {loading ? "Importing..." : "Upload & Import"}
                    </AppButton>
                </div>
            </div>
        </div>
    );
}
