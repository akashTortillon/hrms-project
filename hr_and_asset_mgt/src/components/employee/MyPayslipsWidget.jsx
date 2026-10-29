import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { payrollService } from "../../services/payrollService.js";
import PdfPreviewModal from "../reusable/PdfPreviewModal.jsx";

const PAGE_SIZE = 6;

// Self-service "My Payslips" card - originally built for EmployeeDashboard.jsx only.
// Extracted so the admin DashboardView can render the same widget for HR/Admin users
// who are also linked Employee records, without duplicating the fetch/download logic.
// Lists every processed payslip (newest first), with a month filter, in-app View and
// Download - all backed by the one backend payslip PDF builder.
export default function MyPayslipsWidget() {
    const [payslips, setPayslips] = useState([]);
    const [loaded, setLoaded] = useState(false);
    const [downloadingSlip, setDownloadingSlip] = useState(null);
    const [viewSlip, setViewSlip] = useState(null);
    const [user, setUser] = useState(null);
    const [filterMonth, setFilterMonth] = useState(""); // "YYYY-MM" from <input type="month">
    const [page, setPage] = useState(1);
    // Distinct from true-empty ("no payroll processed yet") - a fetch error (e.g.
    // the backend's 400 "Employee ID not found for user", which happens when this
    // User's account was never linked to an Employee record) used to be caught and
    // silently rendered identically to true-empty, making a real account-linkage
    // bug indistinguishable from "nothing to show yet".
    const [loadError, setLoadError] = useState(false);

    useEffect(() => {
        try {
            setUser(JSON.parse(localStorage.getItem("user")));
        } catch {
            setUser(null);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const params = {};
                if (filterMonth) {
                    const [y, m] = filterMonth.split("-");
                    params.year = Number(y);
                    params.month = Number(m);
                }
                const slips = await payrollService.getMyPayslips(params);
                if (cancelled) return;
                setPayslips(Array.isArray(slips) ? slips : []);
                setLoadError(false);
                setPage(1);
            } catch {
                if (cancelled) return;
                setLoadError(true);
                setPayslips([]);
            } finally {
                if (!cancelled) setLoaded(true);
            }
        })();
        return () => { cancelled = true; };
    }, [filterMonth]);

    const cardStyle = { background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' };
    const titleStyle = { margin: 0, fontSize: '16px', fontWeight: 700, color: '#1f2937' };
    const monthLabel = (slip) => new Date(slip.year, (slip.month || 1) - 1).toLocaleString('default', { month: 'long' });

    if (loadError) {
        return (
            <div style={cardStyle}>
                <h5 style={{ ...titleStyle, margin: '0 0 16px' }}>My Payslips</h5>
                <div style={{ padding: '16px', textAlign: 'center', color: '#b45309', background: '#fffbeb', borderRadius: '8px', fontSize: '13px' }}>
                    Unable to load payslips — please contact HR.
                </div>
            </div>
        );
    }

    // No payslips at all (filter empty) - nothing to filter or page through yet.
    if (loaded && payslips.length === 0 && !filterMonth) {
        return (
            <div style={cardStyle}>
                <h5 style={{ ...titleStyle, margin: '0 0 16px' }}>My Payslips</h5>
                <div style={{ padding: '16px', textAlign: 'center', color: '#6b7280', background: '#f9fafb', borderRadius: '8px', fontSize: '13px' }}>
                    No payslips available yet. They appear here once payroll is processed.
                </div>
            </div>
        );
    }

    const totalPages = Math.max(1, Math.ceil(payslips.length / PAGE_SIZE));
    const pageSlips = payslips.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const pagerBtn = (disabled) => ({
        border: '1px solid #d1d5db', background: 'white', borderRadius: '6px', padding: '4px 12px',
        fontSize: '13px', color: disabled ? '#9ca3af' : '#374151', cursor: disabled ? 'not-allowed' : 'pointer'
    });

    return (
        <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
                <h5 style={titleStyle}>My Payslips</h5>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label htmlFor="payslip-month-filter" style={{ fontSize: '13px', color: '#6b7280' }}>Month</label>
                    <input
                        id="payslip-month-filter"
                        type="month"
                        value={filterMonth}
                        onChange={(e) => setFilterMonth(e.target.value)}
                        style={{ border: '1px solid #d1d5db', borderRadius: '6px', padding: '4px 8px', fontSize: '13px' }}
                    />
                    {filterMonth && (
                        <button type="button" onClick={() => setFilterMonth("")} style={{ border: 'none', background: 'transparent', color: '#2563eb', fontSize: '13px', cursor: 'pointer' }}>
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {payslips.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: '#6b7280', background: '#f9fafb', borderRadius: '8px', fontSize: '13px' }}>
                    No payslip found for the selected month.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {pageSlips.map((slip) => (
                        <div key={slip._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #f3f4f6', borderRadius: '8px', padding: '12px 16px', flexWrap: 'wrap', gap: '8px' }}>
                            <div>
                                <div style={{ fontWeight: 600, color: '#111827' }}>{monthLabel(slip)} {slip.year}</div>
                                <div style={{ fontSize: '13px', color: '#6b7280' }}>Net: {Number(slip.netSalary || 0).toLocaleString()} AED</div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    type="button"
                                    onClick={() => setViewSlip(slip)}
                                    style={{ background: 'white', color: '#2563eb', border: '1px solid #2563eb', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
                                >
                                    View
                                </button>
                                <button
                                    type="button"
                                    disabled={downloadingSlip === slip._id}
                                    onClick={async () => {
                                        setDownloadingSlip(slip._id);
                                        try {
                                            await payrollService.downloadPayslipPdf(slip._id, user?.name);
                                        } catch {
                                            toast.error("Failed to download payslip");
                                        } finally {
                                            setDownloadingSlip(null);
                                        }
                                    }}
                                    style={{ background: '#2563eb', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
                                >
                                    {downloadingSlip === slip._id ? 'Downloading…' : 'Download PDF'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '14px' }}>
                    <button type="button" disabled={page <= 1} style={pagerBtn(page <= 1)} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>Page {page} of {totalPages}</span>
                    <button type="button" disabled={page >= totalPages} style={pagerBtn(page >= totalPages)} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
                </div>
            )}

            <PdfPreviewModal
                show={!!viewSlip}
                title={viewSlip ? `Payslip — ${monthLabel(viewSlip)} ${viewSlip.year}` : "Payslip"}
                onClose={() => setViewSlip(null)}
                fetchBlob={() => payrollService.fetchPayslipPdfBlob(viewSlip._id)}
                downloadFileName={viewSlip ? `Payslip_${monthLabel(viewSlip)}_${viewSlip.year}.pdf` : "Payslip.pdf"}
            />
        </div>
    );
}
