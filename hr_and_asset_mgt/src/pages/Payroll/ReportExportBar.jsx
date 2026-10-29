import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { payrollService } from "../../services/payrollService";
import PdfPreviewModal from "../../components/reusable/PdfPreviewModal.jsx";
import SvgIcon from "../../components/svgIcon/svgView.jsx";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// Export controls for one payroll report (Payroll Sheet / Location / Visa): its own
// month + year filter (defaulting to the page's period), a PDF View, PDF download and
// Excel download - all hitting the same backend export so the formats match.
export default function ReportExportBar({ kind, title, description, defaultMonth, defaultYear, filters = {}, style }) {
    const thisYear = new Date().getFullYear();
    const [month, setMonth] = useState(defaultMonth);
    const [year, setYear] = useState(defaultYear);
    const [busy, setBusy] = useState("");
    const [showPreview, setShowPreview] = useState(false);

    // Follow the page's period whenever it changes (the user can still override below).
    useEffect(() => { setMonth(defaultMonth); setYear(defaultYear); }, [defaultMonth, defaultYear]);

    const opts = (format) => ({ kind, month, year, format, filters });

    const handleDownload = async (format) => {
        try {
            setBusy(format);
            await payrollService.downloadReport(opts(format));
            toast.success(format === "pdf" ? "PDF downloaded" : "Excel downloaded");
        } catch (error) {
            toast.error(error.message || "Export failed.");
        } finally {
            setBusy("");
        }
    };

    const selectStyle = { fontSize: "13px", padding: "6px 8px" };
    const btnStyle = (primary) => ({
        display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 600, cursor: "pointer",
        padding: "7px 14px", borderRadius: "8px",
        border: primary ? "none" : "1px solid #d1d5db",
        background: primary ? "#2563eb" : "white",
        color: primary ? "white" : "#374151"
    });

    return (
        <div className="wps-tool-card export-payslips-bar" style={{ flexWrap: "wrap", ...style }}>
            <div className="tool-icon-box purple"><SvgIcon name="reports" size={20} /></div>
            <div className="tool-content" style={{ flex: "1 1 auto" }}>
                <h4>{title}</h4>
                <p>{description}</p>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", marginLeft: "auto", flexWrap: "wrap" }}>
                <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={selectStyle} aria-label="Year">
                    {Array.from({ length: 6 }, (_, i) => thisYear - i).map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
                <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={selectStyle} aria-label="Month">
                    {MONTH_NAMES.map((name, i) => <option key={name} value={i + 1}>{name}</option>)}
                </select>
                <button type="button" style={btnStyle(false)} onClick={() => setShowPreview(true)}>View</button>
                <button type="button" style={btnStyle(true)} onClick={() => handleDownload("pdf")} disabled={!!busy}>
                    {busy === "pdf" ? "…" : "PDF"}
                </button>
                <button type="button" style={btnStyle(false)} onClick={() => handleDownload("xlsx")} disabled={!!busy}>
                    {busy === "xlsx" ? "…" : "Excel"}
                </button>
            </div>

            <PdfPreviewModal
                show={showPreview}
                title={`${title} — ${MONTH_NAMES[month - 1]} ${year}`}
                onClose={() => setShowPreview(false)}
                fetchBlob={() => payrollService.fetchReportBlob(opts("pdf"))}
                downloadFileName={payrollService.reportFileName(opts("pdf"))}
            />
        </div>
    );
}
