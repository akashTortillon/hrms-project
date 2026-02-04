import React, { useRef } from 'react';
import CustomModal from "../../components/reusable/CustomModal.jsx";
import "../../style/Payroll.css";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PDFDocument } from 'pdf-lib';
import logoLeptis from "../../assets/images/logo-leptis.png";

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
    const handleDownloadPDF = async () => {
        try {
            // 1. Create the content PDF using jsPDF
            const contentDoc = new jsPDF();
            const pageWidth = contentDoc.internal.pageSize.getWidth();
            // const pageHeight = contentDoc.internal.pageSize.getHeight();

            // Note: We leave space for the letterhead header/footer
            // Let's assume content starts at 50mm and ends before 260mm

            // Title
            contentDoc.setFontSize(16);
            contentDoc.setTextColor(40);
            contentDoc.text("PAYSLIP", pageWidth / 2, 55, { align: 'center' });

            contentDoc.setFontSize(12);
            contentDoc.setTextColor(100);
            contentDoc.text(`Period: ${periodStr}`, pageWidth / 2, 61, { align: 'center' });

            // 2. Employee Details
            contentDoc.setFontSize(10);
            contentDoc.setTextColor(0);

            const startY = 70;
            // Details Box
            contentDoc.setDrawColor(240);
            contentDoc.setFillColor(250, 250, 250);
            contentDoc.rect(14, startY - 5, pageWidth - 28, 25, 'F');

            // Left Column
            contentDoc.setFont("helvetica", "normal");
            contentDoc.text("Employee Name:", 20, startY + 2);
            contentDoc.setFont("helvetica", "bold");
            contentDoc.text(employee?.name || "Unknown", 55, startY + 2);

            contentDoc.setFont("helvetica", "normal");
            contentDoc.text("Designation:", 20, startY + 10);
            contentDoc.setFont("helvetica", "bold");
            contentDoc.text(employee?.designation || "N/A", 55, startY + 10);

            // Right Column
            contentDoc.setFont("helvetica", "normal");
            contentDoc.text("Employee ID:", pageWidth / 2 + 10, startY + 2);
            contentDoc.setFont("helvetica", "bold");
            contentDoc.text(employee?.code || "N/A", pageWidth / 2 + 50, startY + 2);

            contentDoc.setFont("helvetica", "normal");
            contentDoc.text("Department:", pageWidth / 2 + 10, startY + 10);
            contentDoc.setFont("helvetica", "bold");
            contentDoc.text(employee?.department || "N/A", pageWidth / 2 + 50, startY + 10);

            // 3. Attendance Summary
            autoTable(contentDoc, {
                startY: startY + 25,
                head: [['Total Days', 'Present', 'Absent', 'Late', 'Overtime (Hrs)']],
                body: [[
                    attendanceSummary?.totalDays || 30,
                    attendanceSummary?.daysPresent || 0,
                    attendanceSummary?.daysAbsent || 0,
                    attendanceSummary?.late || 0,
                    attendanceSummary?.overtimeHours || 0
                ]],
                theme: 'plain',
                styles: { fontSize: 9, cellPadding: 2, halign: 'center' },
                headStyles: { fillColor: [240, 240, 240], textColor: 50, fontStyle: 'bold' }
            });

            // 4. Earnings & Deductions Table
            const earningsRows = [
                ['Basic Salary', basicSalary.toLocaleString()],
                ...(allowances || []).map(a => [a.name, a.amount.toLocaleString()])
            ];

            const deductionRows = [
                ...(deductions || []).map(d => [d.name, d.amount.toLocaleString()])
            ];

            const maxLength = Math.max(earningsRows.length, deductionRows.length);
            const tableBody = [];

            for (let i = 0; i < maxLength; i++) {
                const earn = earningsRows[i] || ['', ''];
                const deduct = deductionRows[i] || ['', ''];
                tableBody.push([earn[0], earn[1], deduct[0], deduct[1]]);
            }

            tableBody.push([
                { content: 'Total Earnings', styles: { fontStyle: 'bold', fillColor: [249, 250, 251] } },
                { content: grossEarnings.toLocaleString(), styles: { fontStyle: 'bold', halign: 'right', fillColor: [249, 250, 251] } },
                { content: 'Total Deductions', styles: { fontStyle: 'bold', fillColor: [249, 250, 251] } },
                { content: totalDeductions.toLocaleString(), styles: { fontStyle: 'bold', halign: 'right', fillColor: [249, 250, 251] } }
            ]);

            autoTable(contentDoc, {
                startY: contentDoc.lastAutoTable.finalY + 10,
                head: [['Earnings', 'Amount (AED)', 'Deductions', 'Amount (AED)']],
                body: tableBody,
                theme: 'grid',
                headStyles: { fillColor: [24, 45, 84], textColor: 255 },
                styles: { fontSize: 9 },
                columnStyles: {
                    0: { cellWidth: 55 },
                    1: { cellWidth: 35, halign: 'right' },
                    2: { cellWidth: 55 },
                    3: { cellWidth: 35, halign: 'right' }
                }
            });

            // 5. Net Salary
            const finalY = contentDoc.lastAutoTable.finalY + 8;

            contentDoc.setFillColor(240, 253, 244);
            contentDoc.rect(14, finalY, pageWidth - 28, 12, 'F');
            contentDoc.setDrawColor(22, 163, 74);
            contentDoc.rect(14, finalY, pageWidth - 28, 12, 'S');

            contentDoc.setFontSize(11);
            contentDoc.setTextColor(21, 128, 61);
            contentDoc.setFont("helvetica", "bold");
            contentDoc.text("NET SALARY PAYABLE", 20, finalY + 8);
            contentDoc.text(`${netSalary.toLocaleString()} AED`, pageWidth - 20, finalY + 8, { align: 'right' });

            // 6. Footer (Signatures)
            const signatureY = finalY + 30; // Closer to content now
            contentDoc.setTextColor(0);
            contentDoc.setFontSize(9);
            contentDoc.setFont("helvetica", "normal");

            contentDoc.line(20, signatureY, 70, signatureY);
            contentDoc.text("Employee Signature", 45, signatureY + 5, { align: 'center' });

            contentDoc.line(pageWidth - 70, signatureY, pageWidth - 20, signatureY);
            contentDoc.text("Employer Signature", pageWidth - 45, signatureY + 5, { align: 'center' });


            // --- MERGE WITH TEMPLATE ---

            // Load the template from the public folder
            const templateUrl = "/Letter_Head_-_Group_2023.pdf";
            const templateBytes = await fetch(templateUrl).then(res => res.arrayBuffer());
            const templatePdf = await PDFDocument.load(templateBytes);

            // Load the generated content PDF
            const contentBytes = contentDoc.output('arraybuffer');
            const contentPdf = await PDFDocument.load(contentBytes);

            // Embed the first page of content PDF onto the template PDF
            const [contentPage] = await templatePdf.embedPdf(contentPdf, [0]);
            const firstPage = templatePdf.getPages()[0];

            // Draw the content on top of the template page
            // Dimensions should match (A4 is standard)
            const { width, height } = firstPage.getSize();
            firstPage.drawPage(contentPage, {
                x: 0,
                y: 0,
                width: width,
                height: height,
            });

            // Save and download
            const mergedPdfBytes = await templatePdf.save();
            const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Payslip_${employee?.name || 'Employee'}_${monthName}_${record.year}.pdf`;
            link.click();

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
            width="900px" // Wider for better view
        >
            <div className="payslip-container">
                <div className="payslip-paper" ref={payslipRef}>

                    {/* Header */}
                    <div className="payslip-header" style={{ borderBottom: '2px solid #182d54', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img src={logoLeptis} alt="Logo" style={{ height: '40px' }} />
                            <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#182d54' }}>leptis</span>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <h1 className="payslip-title" style={{ fontSize: '18px', margin: 0 }}>SALARY SLIP</h1>
                            <p className="payslip-period" style={{ margin: 0 }}>Period: {periodStr}</p>
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#182d54' }}>
                            لبتس
                        </div>
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
                    <table className="payslip-salary-table" style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb' }}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left', padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>Earnings</th>
                                <th style={{ textAlign: 'right', padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>Amount</th>
                                <th style={{ textAlign: 'left', padding: '10px 16px', paddingLeft: '30px', borderBottom: '1px solid #e5e7eb' }}>Deductions</th>
                                <th style={{ textAlign: 'right', padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>Amount</th>
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
                                    earnAmt = (Number(basicSalary) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                } else {
                                    const allow = allowances?.[i - 1]; // -1 because index 0 is Basic
                                    if (allow) {
                                        earnName = allow.name;
                                        earnAmt = (Number(allow.amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                    }
                                }

                                const deduct = deductions?.[i];
                                if (deduct) {
                                    dedName = deduct.name;
                                    dedAmt = (Number(deduct.amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                }

                                if (!earnName && !dedName) return null;

                                return (
                                    <tr key={i}>
                                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>{earnName}</td>
                                        <td style={{ textAlign: 'right', padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>{earnAmt}</td>
                                        <td style={{ paddingLeft: '30px', padding: '10px 16px', paddingLeft: '30px', borderBottom: '1px solid #e5e7eb' }}>{dedName}</td>
                                        <td style={{ textAlign: 'right', padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>{dedAmt}</td>
                                    </tr>
                                );
                            })}

                            {/* Totals Row */}
                            <tr style={{ backgroundColor: '#f3f4f6', fontWeight: 'bold' }}>
                                <td style={{ padding: '10px 16px', borderBottom: '2px solid #374151' }}>Total Earnings</td>
                                <td style={{ textAlign: 'right', padding: '10px 16px', borderBottom: '2px solid #374151' }}>{(Number(grossEarnings) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td style={{ paddingLeft: '30px', padding: '10px 16px', borderBottom: '2px solid #374151' }}>Total Deductions</td>
                                <td style={{ textAlign: 'right', padding: '10px 16px', borderBottom: '2px solid #374151' }}>{totalDeductions > 0 ? (Number(totalDeductions) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Net Pay */}
                    <div className="payslip-net-box">
                        <span className="payslip-net-label">Net Salary Payable</span>
                        <span className="payslip-net-amount">{netSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AED</span>
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
