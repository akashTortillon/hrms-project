import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { payrollService } from "../../services/payrollService.js";

// Self-service "My Payslips" card - originally built for EmployeeDashboard.jsx only.
// Extracted so the admin DashboardView can render the same widget for HR/Admin users
// who are also linked Employee records, without duplicating the fetch/download logic.
export default function MyPayslipsWidget() {
    const [payslips, setPayslips] = useState([]);
    const [downloadingSlip, setDownloadingSlip] = useState(null);
    const [user, setUser] = useState(null);

    useEffect(() => {
        try {
            setUser(JSON.parse(localStorage.getItem("user")));
        } catch {
            setUser(null);
        }

        (async () => {
            try {
                const slips = await payrollService.getMyPayslips();
                setPayslips(Array.isArray(slips) ? slips : []);
            } catch {
                setPayslips([]);
            }
        })();
    }, []);

    if (payslips.length === 0) {
        return (
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
                <h5 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 700, color: '#1f2937' }}>My Payslips</h5>
                <div style={{ padding: '16px', textAlign: 'center', color: '#6b7280', background: '#f9fafb', borderRadius: '8px', fontSize: '13px' }}>
                    No payslips available yet. They appear here once payroll is processed.
                </div>
            </div>
        );
    }

    return (
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
            <h5 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 700, color: '#1f2937' }}>My Payslips</h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {payslips.map((slip) => {
                    const monthName = new Date(slip.year, (slip.month || 1) - 1).toLocaleString('default', { month: 'long' });
                    return (
                        <div key={slip._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #f3f4f6', borderRadius: '8px', padding: '12px 16px', flexWrap: 'wrap', gap: '8px' }}>
                            <div>
                                <div style={{ fontWeight: 600, color: '#111827' }}>{monthName} {slip.year}</div>
                                <div style={{ fontSize: '13px', color: '#6b7280' }}>Net: {Number(slip.netSalary || 0).toLocaleString()} AED</div>
                            </div>
                            <button
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
                    );
                })}
            </div>
        </div>
    );
}
