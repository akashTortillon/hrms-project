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
            width="900px" // Wider for better view
        >
            <div style={{ backgroundColor: '#f3f4f6', padding: '24px', display: 'flex', justifyContent: 'center' }}>
                <div ref={payslipRef} style={{ backgroundColor: '#fff', width: '100%', maxWidth: '750px', padding: '30px 40px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb' }}>

                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #182d54', paddingBottom: '15px', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img src={logoLeptis} alt="Logo" style={{ height: '35px' }} />
                            <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#182d54' }}>leptis</span>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '16px', fontWeight: '700', color: '#111827', letterSpacing: '1px' }}>SALARY SLIP</div>
                            <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>Period: {periodStr}</div>
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#182d54' }}>لبتس</div>
                    </div>

                    {/* Employee Info */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 30px', marginBottom: '20px', padding: '15px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e5e7eb', paddingBottom: '4px' }}>
                            <span style={{ fontWeight: '600', color: '#4b5563', fontSize: '12px' }}>Employee Name</span>
                            <span style={{ color: '#111827', fontWeight: '500', fontSize: '12px' }}>{employee?.name || "N/A"}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e5e7eb', paddingBottom: '4px' }}>
                            <span style={{ fontWeight: '600', color: '#4b5563', fontSize: '12px' }}>Employee ID</span>
                            <span style={{ color: '#111827', fontWeight: '500', fontSize: '12px' }}>{employee?.code || "N/A"}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e5e7eb', paddingBottom: '4px' }}>
                            <span style={{ fontWeight: '600', color: '#4b5563', fontSize: '12px' }}>Designation</span>
                            <span style={{ color: '#111827', fontWeight: '500', fontSize: '12px' }}>{employee?.designation || "N/A"}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e5e7eb', paddingBottom: '4px' }}>
                            <span style={{ fontWeight: '600', color: '#4b5563', fontSize: '12px' }}>Department</span>
                            <span style={{ color: '#111827', fontWeight: '500', fontSize: '12px' }}>{employee?.department || "N/A"}</span>
                        </div>
                    </div>

                    {/* Attendance Summary */}
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>Attendance Summary</div>
                        <div style={{ display: 'flex', gap: '25px', fontSize: '12px', color: '#555', background: '#f9f9f9', padding: '10px 15px', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
                            <div>Total Days: <strong>{attendanceSummary?.totalDays || 30}</strong></div>
                            <div>Present: <strong>{attendanceSummary?.daysPresent || 0}</strong></div>
                            <div>Absent: <strong>{attendanceSummary?.daysAbsent || 0}</strong></div>
                        </div>
                    </div>

                    {/* Salary Table */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                        {/* Earnings */}
                        <div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#182d54' }}>
                                        <th style={{ textAlign: 'left', padding: '10px 12px', color: '#fff', fontSize: '12px', fontWeight: '600' }}>Earnings</th>
                                        <th style={{ textAlign: 'right', padding: '10px 12px', color: '#fff', fontSize: '12px', fontWeight: '600' }}>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb', fontSize: '12px' }}>Basic Salary</td>
                                        <td style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb', fontSize: '12px', textAlign: 'right', fontFamily: 'monospace' }}>{(Number(basicSalary) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    </tr>
                                    {(allowances || []).map((a, idx) => (
                                        <tr key={idx}>
                                            <td style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb', fontSize: '12px' }}>{a.name}</td>
                                            <td style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb', fontSize: '12px', textAlign: 'right', fontFamily: 'monospace' }}>{(Number(a.amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        </tr>
                                    ))}
                                    <tr style={{ backgroundColor: '#f3f4f6', fontWeight: 'bold' }}>
                                        <td style={{ padding: '10px 12px', fontSize: '12px' }}>Total Earnings</td>
                                        <td style={{ padding: '10px 12px', fontSize: '12px', textAlign: 'right', fontFamily: 'monospace' }}>{(Number(grossEarnings) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Deductions */}
                        <div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#182d54' }}>
                                        <th style={{ textAlign: 'left', padding: '10px 12px', color: '#fff', fontSize: '12px', fontWeight: '600' }}>Deductions</th>
                                        <th style={{ textAlign: 'right', padding: '10px 12px', color: '#fff', fontSize: '12px', fontWeight: '600' }}>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayDeductions.length > 0 ? (
                                        displayDeductions.map((d, idx) => (
                                            <tr key={idx}>
                                                <td style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb', fontSize: '12px' }}>{d.name}</td>
                                                <td style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb', fontSize: '12px', textAlign: 'right', fontFamily: 'monospace' }}>{(Number(d.amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="2" style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb', fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>No deductions</td>
                                        </tr>
                                    )}
                                    <tr style={{ backgroundColor: '#f3f4f6', fontWeight: 'bold' }}>
                                        <td style={{ padding: '10px 12px', fontSize: '12px' }}>Total Deductions</td>
                                        <td style={{ padding: '10px 12px', fontSize: '12px', textAlign: 'right', fontFamily: 'monospace' }}>{(Number(totalDeductions) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Net Pay */}
                    <div style={{ backgroundColor: '#f0fdf4', border: '2px solid #16a34a', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '8px', marginBottom: '30px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#15803d', textTransform: 'uppercase' }}>Net Salary Payable</span>
                        <span style={{ fontSize: '20px', fontWeight: '800', color: '#111827' }}>{(Number(netSalary) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AED</span>
                    </div>

                    {/* Footer / Signatures */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ borderTop: '1px solid #374151', width: '150px', marginBottom: '5px' }}></div>
                            <span style={{ fontSize: '11px', color: '#6b7280' }}>Employee Signature</span>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ borderTop: '1px solid #374151', width: '150px', marginBottom: '5px' }}></div>
                            <span style={{ fontSize: '11px', color: '#6b7280' }}>Employer Signature</span>
                        </div>
                    </div>

                    <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '10px', color: '#9ca3af' }}>
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
