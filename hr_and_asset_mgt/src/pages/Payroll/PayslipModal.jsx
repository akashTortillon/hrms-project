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
    const companyName = employee?.company || "LEPTIS HYPERMARKET LLC";
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
                ...displayDeductions.map(d => [d.name, d.amount.toLocaleString()])
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
            width="980px"
            className="payslip-modal-shell"
        >
            <div className="payslip-modal-stage">
                <div ref={payslipRef} className="payslip-sheet">
                    <div className="payslip-sheet__glow" />

                    <div className="payslip-sheet__header">
                        <div className="payslip-brand">
                            <div className="payslip-brand__badge">
                                <img src={logoLeptis} alt="Logo" className="payslip-brand__logo" />
                            </div>
                            <div>
                                <div className="payslip-brand__name">leptis</div>
                                <div className="payslip-brand__subtext">Payroll Statement</div>
                            </div>
                        </div>

                        <div className="payslip-sheet__title">
                            <span className="payslip-sheet__eyebrow">{companyName}</span>
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
