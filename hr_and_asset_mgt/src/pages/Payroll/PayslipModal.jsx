import React from "react";
import PdfPreviewModal from "../../components/reusable/PdfPreviewModal.jsx";
import { payrollService } from "../../services/payrollService";

// Payslip details = the real payslip PDF from the backend (same file the employee
// downloads and the ZIP export contains), shown in-app. Previously this was a third,
// hand-maintained HTML copy of the layout.
export default function PayslipModal({ show, onClose, record }) {
    if (!record) return null;
    const safeName = String(record.employee?.name || "employee").replace(/[^a-z0-9_-]+/gi, "_");
    return (
        <PdfPreviewModal
            show={show}
            title={`Payslip — ${record.employee?.name || ""}`}
            onClose={onClose}
            fetchBlob={() => payrollService.fetchPayslipPdfBlob(record._id)}
            downloadFileName={`Payslip_${safeName}.pdf`}
        />
    );
}
