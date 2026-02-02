import React, { useRef } from 'react';
import CustomModal from "../../components/reusable/CustomModal.jsx";
import "../../style/Payroll.css";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function PayslipModal({ show, onClose, record }) {
    const payslipRef = useRef();

    if (!record) return null;

    const { employee, basicSalary, allowances, deductions, netSalary, attendanceSummary } = record;
    const monthName = record.month ? new Date(2000, record.month - 1).toLocaleString('default', { month: 'long' }) : '';
    const periodStr = `${monthName} ${record.year}`;

    // Calculate Totals
    const totalAllowances = record.totalAllowances || 0;
    const totalDeductions = record.totalDeductions || 0;
    const grossEarnings = basicSalary + totalAllowances;

    // --- PDF GENERATION ---
    const handleDownloadPDF = () => {
        const doc = new jsPDF();

        // 1. Header
        doc.setFontSize(22);
        doc.setTextColor(40);
        doc.text("LEPTIS", 105, 20, { align: 'center' }); // Replace with Company Name

        doc.setFontSize(16);
        doc.text("PAYSLIP", 105, 30, { align: 'center' });

        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(`Period: ${periodStr}`, 105, 38, { align: 'center' });

        doc.line(14, 45, 196, 45); // Horizontal line

        // 2. Employee Details (Grid Layout manually)
        doc.setFontSize(11);
        doc.setTextColor(0);

        const startY = 55;
        // Left Column
        doc.text("Employee Name:", 14, startY);
        doc.setFont("helvetica", "bold");
        doc.text(employee?.name || "Unknown", 50, startY);
        doc.setFont("helvetica", "normal");

        doc.text("Designation:", 14, startY + 8);
        doc.setFont("helvetica", "bold");
        doc.text(employee?.designation || "N/A", 50, startY + 8);
        doc.setFont("helvetica", "normal");

        // Right Column
        doc.text("Employee ID:", 120, startY);
        doc.setFont("helvetica", "bold");
        doc.text(employee?.code || "N/A", 155, startY);
        doc.setFont("helvetica", "normal");

        doc.text("Department:", 120, startY + 8);
        doc.setFont("helvetica", "bold");
        doc.text(employee?.department || "N/A", 155, startY + 8);
        doc.setFont("helvetica", "normal");

        // 3. Attendance Summary (Optional)
        autoTable(doc, {
            startY: startY + 20,
            head: [['Total Days', 'Present', 'Absent', 'Late', 'Overtime (Hrs)']],
            body: [[
                attendanceSummary?.totalDays || 30,
                attendanceSummary?.daysPresent || 0,
                attendanceSummary?.daysAbsent || 0,
                attendanceSummary?.late || 0,
                attendanceSummary?.overtimeHours || 0
            ]],
            theme: 'plain',
            styles: { fontSize: 10, cellPadding: 2, halign: 'center' },
            headStyles: { fillColor: [240, 240, 240], textColor: 50 }
        });

        // 4. Earnings & Deductions Table
        // We'll prepare rows combining both or side-by-side. 
        // Standard format often has Earnings Col | Amount | Deductions Col | Amount

        const earningsRows = [
            ['Basic Salary', basicSalary.toLocaleString()],
            ...(allowances || []).map(a => [a.name, a.amount.toLocaleString()])
        ];

        const deductionRows = [
            ...(deductions || []).map(d => [d.name, d.amount.toLocaleString()])
        ];

        // Pad rows to match length
        const maxLength = Math.max(earningsRows.length, deductionRows.length);
        const tableBody = [];

        for (let i = 0; i < maxLength; i++) {
            const earn = earningsRows[i] || ['', ''];
            const deduct = deductionRows[i] || ['', ''];
            tableBody.push([earn[0], earn[1], deduct[0], deduct[1]]);
        }

        // Add Totals Row
        tableBody.push([
            { content: 'Total Earnings', styles: { fontStyle: 'bold' } },
            { content: grossEarnings.toLocaleString(), styles: { fontStyle: 'bold' } },
            { content: 'Total Deductions', styles: { fontStyle: 'bold' } },
            { content: totalDeductions.toLocaleString(), styles: { fontStyle: 'bold' } }
        ]);

        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 15,
            head: [['Earnings', 'Amount (AED)', 'Deductions', 'Amount (AED)']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [55, 65, 81] }, // Dark gray
            styles: { fontSize: 10 },
            columnStyles: {
                0: { cellWidth: 60 },
                1: { cellWidth: 35, halign: 'right' },
                2: { cellWidth: 60 },
                3: { cellWidth: 35, halign: 'right' }
            }
        });

        // 5. Net Salary
        const finalY = doc.lastAutoTable.finalY + 10;

        doc.setFillColor(240, 253, 244); // Light green bg
        doc.rect(14, finalY, 182, 12, 'F');
        doc.setDrawColor(22, 163, 74); // Green border
        doc.rect(14, finalY, 182, 12, 'S');

        doc.setFontSize(12);
        doc.setTextColor(21, 128, 61); // Green text
        doc.setFont("helvetica", "bold");
        doc.text("NET SALARY PAYABLE", 20, finalY + 8);
        doc.text(`${netSalary.toLocaleString()} AED`, 190, finalY + 8, { align: 'right' });

        // 6. Footer (Signatures)
        const footerY = finalY + 40;
        doc.setTextColor(0);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");

        doc.line(20, footerY, 70, footerY);
        doc.text("Employee Signature", 45, footerY + 5, { align: 'center' });

        doc.line(140, footerY, 190, footerY);
        doc.text("Employer Signature", 165, footerY + 5, { align: 'center' });

        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text("This is a computer-generated document.", 105, 280, { align: 'center' });

        doc.save(`Payslip_${employee?.name || 'Employee'}_${monthName}_${record.year}.pdf`);
    };

    return (
        <CustomModal
            show={show}
            title="Payslip Details"
            onClose={onClose}
            width="900px" // Wider for better view
        >
            <div className="payslip-container">
                <div className="payslip-paper" ref={payslipRef}>

                    {/* Header */}
                    <div className="payslip-header">
                        <h1 className="payslip-title">SALARY SLIP</h1>
                        <h2 className="payslip-company">LEPTIS</h2>
                        <p className="payslip-period">Period: {periodStr}</p>
                    </div>

                    {/* Employee Info Grid */}
                    <div className="payslip-employee-grid">
                        <div className="payslip-info-item">
                            <span className="payslip-label">Employee Name</span>
                            <span className="payslip-value">{employee?.name || "Unknown"}</span>
                        </div>
                        <div className="payslip-info-item">
                            <span className="payslip-label">Employee ID</span>
                            <span className="payslip-value">{employee?.code || "N/A"}</span>
                        </div>
                        <div className="payslip-info-item">
                            <span className="payslip-label">Designation</span>
                            <span className="payslip-value">{employee?.designation || "N/A"}</span>
                        </div>
                        <div className="payslip-info-item">
                            <span className="payslip-label">Department</span>
                            <span className="payslip-value">{employee?.department || "N/A"}</span>
                        </div>
                        <div className="payslip-info-item">
                            <span className="payslip-label">Joining Date</span>
                            <span className="payslip-value">{employee?.joiningDate ? new Date(employee.joiningDate).toLocaleDateString() : 'N/A'}</span>
                        </div>
                        <div className="payslip-info-item">
                            <span className="payslip-label">Bank Account</span>
                            <span className="payslip-value">{employee?.bankAccountNumber || 'N/A'}</span>
                        </div>
                    </div>

                    {/* Attendance (Optional Display) */}
                    <div style={{ marginBottom: '20px' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#374151' }}>Attendance Summary</h4>
                        <div style={{ display: 'flex', gap: '20px', fontSize: '12px', color: '#555', background: '#f9f9f9', padding: '10px', borderRadius: '4px' }}>
                            <div>Total Days: <strong>{attendanceSummary?.totalDays || 30}</strong></div>
                            <div>Present: <strong>{attendanceSummary?.daysPresent || 0}</strong></div>
                            <div>Absent: <strong>{attendanceSummary?.daysAbsent || 0}</strong></div>
                        </div>
                    </div>

                    {/* Salary Table */}
                    <table className="payslip-salary-table">
                        <thead>
                            <tr>
                                <th style={{ width: '35%' }}>Earnings</th>
                                <th style={{ width: '15%', textAlign: 'right' }}>Amount</th>
                                <th style={{ width: '35%', paddingLeft: '24px' }}>Deductions</th>
                                <th style={{ width: '15%', textAlign: 'right' }}>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* We render max rows to keep alignment */}
                            {Array.from({ length: Math.max((allowances?.length || 0) + 1, (deductions?.length || 0)) }).map((_, i) => {
                                const isBasic = i === 0;
                                let earnName = '', earnAmt = '';
                                let dedName = '', dedAmt = '';

                                if (isBasic) {
                                    earnName = 'Basic Salary';
                                    earnAmt = basicSalary.toLocaleString();
                                } else {
                                    const allow = allowances?.[i - 1]; // -1 because index 0 is Basic
                                    if (allow) {
                                        earnName = allow.name;
                                        earnAmt = allow.amount.toLocaleString();
                                    }
                                }

                                const deduct = deductions?.[i];
                                if (deduct) {
                                    dedName = deduct.name;
                                    dedAmt = deduct.amount.toLocaleString();
                                }

                                if (!earnName && !dedName) return null;

                                return (
                                    <tr key={i}>
                                        <td>{earnName}</td>
                                        <td className="payslip-amount">{earnAmt}</td>
                                        <td style={{ paddingLeft: '24px' }}>{dedName}</td>
                                        <td className="payslip-amount">{dedAmt}</td>
                                    </tr>
                                );
                            })}

                            {/* Totals Row */}
                            <tr style={{ backgroundColor: '#f3f4f6', fontWeight: 'bold' }}>
                                <td>Total Earnings</td>
                                <td className="payslip-amount">{grossEarnings.toLocaleString()}</td>
                                <td style={{ paddingLeft: '24px' }}>Total Deductions</td>
                                <td className="payslip-amount">{totalDeductions > 0 ? totalDeductions.toLocaleString() : '0'}</td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Net Pay */}
                    <div className="payslip-net-box">
                        <span className="payslip-net-label">Net Salary Payable</span>
                        <span className="payslip-net-amount">{netSalary.toLocaleString()} AED</span>
                    </div>

                    {/* Footer / Signatures */}
                    <div className="payslip-footer">
                        <div className="payslip-signature">
                            Employee Signature
                        </div>
                        <div className="payslip-signature">
                            Employer Signature
                        </div>
                    </div>

                    <div className="payslip-note">
                        This is a computer-generated payslip.
                    </div>

                </div>
            </div>

            {/* Modal Actions */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button onClick={onClose} className="btn btn-secondary">Close</button>
                <button onClick={handleDownloadPDF} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download PDF
                </button>
            </div>
        </CustomModal>
    );
}
