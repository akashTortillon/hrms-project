import React from 'react';
import CustomModal from "../../components/reusable/CustomModal.jsx";
import "../../style/Payroll.css";
import { downloadPayslipPdf, getPayslipBranding } from "./payslipPdf.js";

export default function PayslipModal({ show, onClose, record, companies = [] }) {
    if (!record) return null;

    const { employee, basicSalary, allowances, deductions, netSalary, attendanceSummary } = record;
    const { companyName, companyLogoSrc } = getPayslipBranding(record, companies);
    
    const monthName = record.month ? new Date(2000, record.month - 1).toLocaleString('default', { month: 'long' }) : '';
    const periodStr = `${monthName} ${record.year}`;

    // Calculate Totals visually modifying hidden advances
    const totalAllowances = record.totalAllowances || 0;

    // Hide Salary Advance visually
    let displayDeductions = [];
    let hiddenAdvanceAmount = 0;
    (record.deductions || []).forEach(d => {
        if (d.name && d.name.toLowerCase().includes("salary advance")) {
            hiddenAdvanceAmount += d.amount;
        } else {
            displayDeductions.push(d);
        }
    });

    const totalDeductions = (record.totalDeductions || 0) - hiddenAdvanceAmount;
    const grossEarnings = basicSalary + totalAllowances;
    const formatAmount = (value) =>
        (Number(value) || 0).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

    const handleDownloadPDF = async () => {
        try {
            await downloadPayslipPdf(record, companies);
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Failed to generate PDF. Please try again.");
        }
    };

    return (
        <CustomModal
            show={show}
            title="Payslip Details"
            onClose={onClose}
            width="980px"
            className="payslip-modal-shell"
        >
            <style>
            {`
            .payslip-modal-stage {
                background: #f8fafc;
                padding: 30px;
                display: flex;
                justify-content: center;
                overflow-y: auto;
            }
            .payslip-sheet {
                background: #fff;
                width: 100%;
                max-width: 850px;
                padding: 40px 50px;
                border-radius: 16px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08); /* Re-adding shadow for web view */
                border: 1px solid #e2e8f0;
                position: relative;
                color: #1e293b;
                font-family: 'Inter', sans-serif;
            }
            .payslip-sheet__glow {
                display: none; 
            }
            .payslip-sheet__header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                border-bottom: 2px solid #f1f5f9;
                padding-bottom: 24px;
                margin-bottom: 30px;
            }
            .payslip-brand {
                display: flex;
                align-items: center;
                gap: 16px;
            }
            .payslip-brand__badge {
                width: 80px;
                height: 80px;
                border-radius: 12px;
                background: #fff;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 1px solid #e2e8f0;
                overflow: hidden;
            }
            .payslip-brand__logo {
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
            }
            .payslip-brand__name {
                font-size: 22px;
                font-weight: 800;
                letter-spacing: -0.5px;
                color: #0f172a;
            }
            .payslip-brand__subtext {
                font-size: 13px;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 1px;
                font-weight: 600;
                margin-top: 4px;
            }
            .payslip-sheet__title {
                text-align: right;
            }
            .payslip-sheet__eyebrow {
                font-size: 12px;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 1.5px;
                font-weight: 700;
            }
            .payslip-sheet__title h2 {
                margin: 6px 0;
                font-size: 28px;
                color: #0f172a;
                font-weight: 900;
                letter-spacing: -1px;
            }
            .payslip-sheet__title p {
                font-size: 14px;
                color: #334155;
                font-weight: 500;
                margin:0;
            }
            .payslip-sheet__arabic {
                display: none;
            }
            
            .payslip-identity-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 16px;
                background: #f8fafc;
                padding: 20px;
                border-radius: 12px;
                border: 1px solid #e2e8f0;
                margin-bottom: 30px;
            }
            .payslip-info-card__label {
                font-size: 12px;
                color: #64748b;
                font-weight: 600;
                margin-bottom: 4px;
                text-transform: uppercase;
            }
            .payslip-info-card__value {
                font-size: 15px;
                color: #0f172a;
                font-weight: 700;
            }

            .payslip-section {
                margin-bottom: 30px;
            }
            .payslip-section__title {
                font-size: 16px;
                font-weight: 700;
                color: #1e293b;
                margin-bottom: 12px;
                border-bottom: 2px solid #e2e8f0;
                padding-bottom: 8px;
            }
            .payslip-summary-grid {
                display: flex;
                gap: 24px;
            }
            .payslip-summary-stat {
                display: flex;
                flex-direction: column;
                background: #f1f5f9;
                padding: 12px 20px;
                border-radius: 8px;
                min-width: 120px;
            }
            .payslip-summary-stat__label {
                font-size: 12px;
                color: #64748b;
                font-weight: 600;
            }
            .payslip-summary-stat__value {
                font-size: 20px;
                color: #0f172a;
                font-weight: 800;
                margin-top: 4px;
            }
            .payslip-summary-stat--alert {
                background: #fef2f2;
            }
            .payslip-summary-stat--alert .payslip-summary-stat__value {
                color: #ef4444;
            }

            .payslip-amount-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 30px;
                margin-bottom: 30px;
            }
            .payslip-table {
                width: 100%;
                border-collapse: collapse;
            }
            .payslip-table th {
                text-align: left;
                padding: 12px 16px;
                background: #1e293b;
                color: #fff;
                font-size: 13px;
                font-weight: 600;
                text-transform: uppercase;
            }
            .payslip-table th:last-child {
                text-align: right;
            }
            .payslip-table td {
                padding: 12px 16px;
                border-bottom: 1px solid #e2e8f0;
                font-size: 14px;
                color: #334155;
            }
            .payslip-table__amount {
                text-align: right;
                font-family: 'Courier New', Courier, monospace;
                font-weight: 700;
                color: #0f172a;
            }
            .payslip-table__total td {
                background: #f8fafc;
                font-weight: 800;
                font-size: 15px;
                color: #0f172a;
                border-bottom: none;
                border-top: 2px solid #cbd5e1;
            }
            .payslip-table__empty {
                text-align: center;
                font-style: italic;
                color: #94a3b8 !important;
                padding: 20px !important;
            }

            .payslip-net-card {
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
                border: 1px solid #bbf7d0;
                padding: 24px 30px;
                border-radius: 12px;
                margin-bottom: 40px;
            }
            .payslip-net-card__label {
                font-size: 18px;
                font-weight: 800;
                color: #166534;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .payslip-net-card__subtext {
                font-size: 13px;
                color: #15803d;
                margin-top: 4px;
            }
            .payslip-net-card__value {
                font-size: 32px;
                font-weight: 900;
                color: #14532d;
            }

            .payslip-signatures {
                display: flex;
                justify-content: space-between;
                margin-top: 60px;
                padding: 0 40px;
            }
            .payslip-signature {
                text-align: center;
            }
            .payslip-signature__line {
                width: 200px;
                border-top: 1px solid #94a3b8;
                margin-bottom: 12px;
            }
            .payslip-signature span {
                font-size: 13px;
                color: #64748b;
                font-weight: 600;
                text-transform: uppercase;
            }

            .payslip-footnote {
                text-align: center;
                font-size: 12px;
                color: #94a3b8;
                margin-top: 40px;
                font-style: italic;
            }
            
            .payslip-actions {
                display: flex;
                justify-content: flex-end;
                gap: 16px;
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid #e2e8f0;
            }
            .payslip-actions .btn {
                padding: 10px 20px;
                font-size: 14px;
                font-weight: 600;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
                border: 2px solid transparent;
            }
            .payslip-actions .btn-secondary {
                background-color: #f1f5f9;
                color: #475569;
                border-color: #cbd5e1;
            }
            .payslip-actions .btn-secondary:hover {
                background-color: #e2e8f0;
                color: #1e293b;
            }
            .payslip-actions .btn-primary {
                background-color: #2563eb;
                color: #ffffff;
                box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
            }
            .payslip-actions .btn-primary:hover {
                background-color: #1d4ed8;
                box-shadow: 0 6px 16px rgba(37, 99, 235, 0.3);
            }
            .payslip-download-btn {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            `}
            </style>
            <div className="payslip-modal-stage">
                <div className="payslip-sheet">
                    <div className="payslip-sheet__glow" />

                    <div className="payslip-sheet__header">
                        <div className="payslip-brand">
                            <div className="payslip-brand__badge">
                                <img src={companyLogoSrc} alt={companyName} className="payslip-brand__logo" onError={(e) => { e.target.style.display='none'; }} />
                            </div>
                            <div>
                                <div className="payslip-brand__name">{companyName}</div>
                                <div className="payslip-brand__subtext">Payroll Statement</div>
                            </div>
                        </div>

                        <div className="payslip-sheet__title">
                            <span className="payslip-sheet__eyebrow"></span>
                            <h2>SALARY SLIP</h2>
                            <p>Period: {periodStr}</p>
                        </div>

                        <div className="payslip-sheet__arabic">لبتس</div>
                    </div>

                    <div className="payslip-identity-grid">
                        <div className="payslip-info-card">
                            <div className="payslip-info-card__label">Employee Name</div>
                            <div className="payslip-info-card__value">{employee?.name || "N/A"}</div>
                        </div>
                        <div className="payslip-info-card">
                            <div className="payslip-info-card__label">Employee ID</div>
                            <div className="payslip-info-card__value">{employee?.code || "N/A"}</div>
                        </div>
                        <div className="payslip-info-card">
                            <div className="payslip-info-card__label">Designation</div>
                            <div className="payslip-info-card__value">{employee?.designation || "N/A"}</div>
                        </div>
                        <div className="payslip-info-card">
                            <div className="payslip-info-card__label">Department</div>
                            <div className="payslip-info-card__value">{employee?.department || "N/A"}</div>
                        </div>
                    </div>

                    <div className="payslip-section">
                        <div className="payslip-section__title">Attendance Summary</div>
                        <div className="payslip-summary-grid">
                            <div className="payslip-summary-stat">
                                <span className="payslip-summary-stat__label">Total Days</span>
                                <strong className="payslip-summary-stat__value">{attendanceSummary?.totalDays || 30}</strong>
                            </div>
                            <div className="payslip-summary-stat">
                                <span className="payslip-summary-stat__label">Present</span>
                                <strong className="payslip-summary-stat__value">{attendanceSummary?.daysPresent || 0}</strong>
                            </div>
                            <div className="payslip-summary-stat payslip-summary-stat--alert">
                                <span className="payslip-summary-stat__label">Absent</span>
                                <strong className="payslip-summary-stat__value">{attendanceSummary?.daysAbsent || 0}</strong>
                            </div>
                        </div>
                    </div>

                    <div className="payslip-amount-grid">
                        <div>
                            <table className="payslip-table">
                                <thead>
                                    <tr>
                                        <th>Earnings</th>
                                        <th>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>Basic Salary</td>
                                        <td className="payslip-table__amount">{formatAmount(basicSalary)}</td>
                                    </tr>
                                    {(allowances || []).map((a, idx) => (
                                        <tr key={idx}>
                                            <td>{a.name}</td>
                                            <td className="payslip-table__amount">{formatAmount(a.amount)}</td>
                                        </tr>
                                    ))}
                                    <tr className="payslip-table__total">
                                        <td>Total Earnings</td>
                                        <td className="payslip-table__amount">{formatAmount(grossEarnings)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div>
                            <table className="payslip-table">
                                <thead>
                                    <tr>
                                        <th>Deductions</th>
                                        <th>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayDeductions.length > 0 ? (
                                        displayDeductions.map((d, idx) => (
                                            <tr key={idx}>
                                                <td>{d.name}</td>
                                                <td className="payslip-table__amount">{formatAmount(d.amount)}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="2" className="payslip-table__empty">No deductions</td>
                                        </tr>
                                    )}
                                    <tr className="payslip-table__total">
                                        <td>Total Deductions</td>
                                        <td className="payslip-table__amount">{formatAmount(totalDeductions)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="payslip-net-card">
                        <div>
                            <div className="payslip-net-card__label">Net Salary Payable</div>
                            <div className="payslip-net-card__subtext">Final payout after deductions</div>
                        </div>
                        <div className="payslip-net-card__value">{formatAmount(netSalary)} AED</div>
                    </div>

                    <div className="payslip-signatures">
                        <div className="payslip-signature">
                            <div className="payslip-signature__line"></div>
                            <span>Employee Signature</span>
                        </div>
                        <div className="payslip-signature">
                            <div className="payslip-signature__line"></div>
                            <span>Employer Signature</span>
                        </div>
                    </div>

                    <div className="payslip-footnote">
                        This is a computer-generated payslip.
                    </div>
                </div>
            </div>

            <div className="payslip-actions">
                <button onClick={onClose} className="btn btn-secondary">Close</button>
                <button onClick={handleDownloadPDF} className="btn btn-primary payslip-download-btn">
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download PDF
                </button>
            </div>
        </CustomModal>
    );
}
