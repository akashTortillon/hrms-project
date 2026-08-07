import { useEffect, useMemo, useState } from "react";
import CustomModal from "../../components/reusable/CustomModal.jsx";
import AppButton from "../../components/reusable/Button.jsx";

export default function AdjustLoanModal({ show, request, onClose, onSubmit, submitting = false }) {
    const [monthlyRepaymentAmount, setMonthlyRepaymentAmount] = useState("");
    const [reason, setReason] = useState("");

    useEffect(() => {
        if (show && request) {
            setMonthlyRepaymentAmount(request.details?.monthlyRepaymentAmount || "");
            setReason("");
        }
    }, [show, request?._id]);

    const remainingBalance = useMemo(() => {
        if (!request) return 0;
        const totalPayable = Number(request.details?.totalRepaymentAmount) || Number(request.details?.amount) || 0;
        const alreadyPaid = (request.payrollDeductions || []).reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
        return Math.max(0, totalPayable - alreadyPaid);
    }, [request]);

    const projectedAdditionalMonths = useMemo(() => {
        const monthly = parseFloat(monthlyRepaymentAmount) || 0;
        if (monthly <= 0 || remainingBalance <= 0) return null;
        return Math.ceil(remainingBalance / monthly);
    }, [monthlyRepaymentAmount, remainingBalance]);

    const handleSubmit = async () => {
        if (!(parseFloat(monthlyRepaymentAmount) > 0) || !reason.trim()) return;
        await onSubmit(request._id, {
            action: "ADJUST",
            monthlyRepaymentAmount: parseFloat(monthlyRepaymentAmount),
            reason: reason.trim()
        });
    };

    if (!show || !request) return null;

    const monthsAlreadyDeducted = (request.payrollDeductions || []).length;

    return (
        <CustomModal
            show={show}
            title="Adjust Loan Repayment"
            onClose={onClose}
            footer={(
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", width: "100%" }}>
                    <AppButton variant="secondary" onClick={onClose}>
                        Cancel
                    </AppButton>
                    <AppButton
                        variant="warning"
                        onClick={handleSubmit}
                        disabled={submitting || !(parseFloat(monthlyRepaymentAmount) > 0) || !reason.trim()}
                    >
                        {submitting ? "Saving..." : "Save Adjustment"}
                    </AppButton>
                </div>
            )}
        >
            <div style={{ display: "grid", gap: "16px" }}>
                <div style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    padding: "14px 16px",
                    color: "#334155",
                    fontSize: "14px"
                }}>
                    Remaining balance: <strong>{remainingBalance.toFixed(2)} AED</strong> ({monthsAlreadyDeducted} deduction{monthsAlreadyDeducted === 1 ? "" : "s"} already made).
                    Changing the monthly amount recalculates how many more months are needed to clear it —
                    already-deducted months are untouched.
                </div>

                <div>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: 600, color: "#1f2937" }}>
                        New Monthly Repayment Amount (AED)
                    </label>
                    <input
                        type="number"
                        min="0"
                        value={monthlyRepaymentAmount}
                        onChange={(e) => setMonthlyRepaymentAmount(e.target.value)}
                        className="form-control"
                        style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                    />
                    {projectedAdditionalMonths !== null && (
                        <div style={{ marginTop: "8px", fontSize: "13px", color: "#6b7280" }}>
                            {projectedAdditionalMonths} more month{projectedAdditionalMonths === 1 ? "" : "s"} needed at this rate
                            ({monthsAlreadyDeducted + projectedAdditionalMonths} month{(monthsAlreadyDeducted + projectedAdditionalMonths) === 1 ? "" : "s"} total).
                        </div>
                    )}
                </div>

                <div>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: 600, color: "#1f2937" }}>
                        Reason <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={4}
                        placeholder="Required for the audit trail"
                        className="form-control"
                        style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #d1d5db", resize: "vertical" }}
                    />
                </div>
            </div>
        </CustomModal>
    );
}
