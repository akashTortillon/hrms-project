import { useState, useEffect } from "react";
import api from "../../../api/apiClient"; // ✅ Use configured API client
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import Card from "../../../components/reusable/Card";
import Button from "../../../components/reusable/Button";
import SvgIcon from "../../../components/svgIcon/svgView";
import "../../../style/CustomReportBuilder.css"; // ✅ Import new CSS
import CustomSelect from "../../../components/reusable/CustomSelect";

const DATASETS = {
    Employees: ["name", "code", "department", "designation", "status", "joinDate", "basicSalary", "email"],
    Assets: ["name", "assetCode", "category", "type", "location", "status", "purchaseCost", "purchaseDate"],
    Attendance: ["employee.name", "employee.code", "date", "status", "checkIn", "checkOut", "workHours"],
    Payroll: ["employee.name", "employee.code", "month", "year", "basicSalary", "totalAllowances", "totalDeductions", "netSalary", "status"]
};

export default function CustomReportBuilder() {
    const [searchParams] = useSearchParams();
    const editingId = searchParams.get("id");

    const [selectedDataset, setSelectedDataset] = useState("Employees");
    const [selectedColumns, setSelectedColumns] = useState([]);
    const [reportTitle, setReportTitle] = useState("");
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (editingId) {
            fetchConfig();
        }
    }, [editingId]);

    const fetchConfig = async () => {
        try {
            const response = await api.get("/api/reports/custom-configs");
            const config = response.data.data.find(c => c._id === editingId);
            if (config) {
                setReportTitle(config.title);
                setSelectedDataset(config.dataset);
                setSelectedColumns(config.columns);

                if (searchParams.get("run") === "true") {
                    setTimeout(() => {
                        handlePreviewRequest(config.dataset, config.columns);
                    }, 500);
                }
            }
        } catch (err) {
            toast.error("Failed to load configuration");
        }
    };

    const handlePreviewRequest = async (dataset, columns) => {
        try {
            setLoading(true);
            const response = await api.post("/api/reports/custom", {
                dataset,
                columns,
                filters: {}
            });
            if (response.data.success) {
                setReportData(response.data.data);
                toast.success("Report data loaded");
            }
        } catch (err) {
            toast.error("Failed to load report data");
        } finally {
            setLoading(false);
        }
    };

    const toggleColumn = (col) => {
        if (selectedColumns.includes(col)) {
            setSelectedColumns(selectedColumns.filter(c => c !== col));
        } else {
            setSelectedColumns([...selectedColumns, col]);
        }
    };

    const handlePreview = async () => {
        if (!selectedColumns.length) {
            toast.error("Please select at least one column");
            return;
        }

        try {
            setLoading(true);
            const response = await api.post("/api/reports/custom", {
                dataset: selectedDataset,
                columns: selectedColumns,
                filters: {}
            });

            if (response.data.success) {
                setReportData(response.data.data);
                toast.success("Preview generated");
            }
        } catch (err) {
            toast.error("Failed to generate preview");
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        if (!selectedColumns.length) return;

        try {
            toast.info("Preparing export...");
            const response = await api.post("/api/reports/custom", {
                dataset: selectedDataset,
                columns: selectedColumns,
                filters: {},
                export: true
            }, { responseType: 'blob' });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Custom_Report_${selectedDataset}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            toast.error("Export failed");
        }
    };

    const handleSave = async () => {
        if (!selectedColumns.length || !reportTitle.trim()) {
            toast.error("Title and at least one column are required to save");
            return;
        }

        try {
            const payload = {
                title: reportTitle,
                dataset: selectedDataset,
                columns: selectedColumns,
                filters: {}
            };

            if (editingId) {
                await api.patch(`/api/reports/custom-configs/${editingId}`, payload);
                toast.success("Report updated");
            } else {
                await api.post("/api/reports/custom-configs", payload);
                toast.success("Report saved to Recent Reports");
            }
        } catch (err) {
            toast.error("Failed to save report");
        }
    };

    return (
        <div className="custom-report-page">
            <div className="report-back-btn">
                <Button variant="outline" onClick={() => window.history.back()}>
                    <SvgIcon name="arrow-left" size={16} /> Back to Reports
                </Button>
            </div>

            <div className="report-builder-layout">
                {/* Left: Configuration */}
                <div className="report-config-panel">
                    <Card className="report-config-card">
                        <h3 className="report-section-title">Report Title</h3>
                        <input
                            type="text"
                            placeholder="Enter report title (e.g., Sales 2024)"
                            className="report-input"
                            value={reportTitle}
                            onChange={(e) => setReportTitle(e.target.value)}
                        />

                        <h3 className="report-section-title">Select Dataset</h3>
                        <CustomSelect
                            value={selectedDataset}
                            onChange={(val) => {
                                setSelectedDataset(val);
                                setSelectedColumns([]);
                                setReportData([]);
                            }}
                            options={Object.keys(DATASETS).map(ds => ({ value: ds, label: ds }))}
                            placeholder="Select Dataset"
                        />

                        <h3 className="report-section-title">Select Columns</h3>
                        <div className="report-columns-grid">
                            {DATASETS[selectedDataset].map(col => (
                                <label key={col} className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        className="checkbox-input"
                                        checked={selectedColumns.includes(col)}
                                        onChange={() => toggleColumn(col)}
                                    />
                                    {col.split('.').pop().replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                </label>
                            ))}
                        </div>

                        <div className="report-actions">
                            <div className="report-btn-preview">
                                <Button onClick={handlePreview} disabled={loading} style={{ width: '100%' }}>
                                    {loading ? "Loading..." : "Preview Data"}
                                </Button>
                            </div>
                            <div className="report-btn-save">
                                <Button variant="outline" onClick={handleSave} disabled={loading || !selectedColumns.length} style={{ width: '100%' }}>
                                    Save Report
                                </Button>
                            </div>
                            <div className="report-btn-export">
                                <Button variant="outline" onClick={handleExport} disabled={loading || !reportData.length} style={{ width: '100%' }}>
                                    Export Excel
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Right: Preview */}
                <div className="report-preview-panel">
                    <Card className="report-preview-card">
                        <h3 className="report-section-title" style={{ marginTop: 0 }}>Preview (Top 10 records)</h3>
                        {!reportData.length ? (
                            <div className="preview-empty-state">
                                <SvgIcon name="reports" size={48} />
                                <p>Select columns and click Preview to see data</p>
                            </div>
                        ) : (
                            <table className="report-table">
                                <thead>
                                    <tr>
                                        {selectedColumns.map(col => (
                                            <th key={col}>{col.split('.').pop().replace(/([A-Z])/g, ' $1').toUpperCase()}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.slice(0, 10).map((row, i) => (
                                        <tr key={i}>
                                            {selectedColumns.map(col => (
                                                <td key={col}>{row[col]?.toString() || "N/A"}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
}
