import { useEffect, useMemo, useState } from "react";
import CustomModal from "../../components/reusable/CustomModal.jsx";
import AppButton from "../../components/reusable/Button.jsx";

export default function ExtraPaymentModal({ show, request, onClose, onSubmit, submitting = false }) {
    const [extraPaymentAmount, setExtraPaymentAmount] = useState("");
    const [reason, setReason] = useState("");

    useEffect(() => {
        if (show && request) {
            setExtraPaymentAmount("");
            setReason("");
        }
    }, [show, request?._id]);

    const remainingBalance = useMemo(() => {
        if (!request) return 0;
        const totalPayable = Number(request.details?.totalRepaymentAmount) || Number(request.details?.amount) || 0;
        const alreadyPaid = (request.payrollDeductions || []).reduce((sum, d) => sum + (Number(d.amount) || 0), 0)
            + (request.details?.extraPayments || []).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        return Math.max(0, totalPayable - alreadyPaid);
    }, [request]);

    const amountValue = parseFloat(extraPaymentAmount) || 0;
    const remainingAfter = Math.max(0, remainingBalance - amountValue);
    const willFullyClear = amountValue > 0 && remainingAfter <= 0;
    const isValid = amountValue > 0 && amountValue <= remainingBalance + 0.01 && reason.trim();

    const handleSubmit = async () => {
        if (!isValid) return;
        await onSubmit(request._id, {
            action: "EXTRA_PAYMENT",
            extraPaymentAmount: amountValue,
            reason: reason.trim()
        });
    };

    if (!show || !request) return null;

    return (
        <CustomModal
            show={show}
            title="Record Extra Payment"
            onClose={onClose}
            footer={(
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", width: "100%" }}>
                    <AppButton variant="secondary" onClick={onClose}>
                        Cancel
                    </AppButton>
                    <AppButton
                        variant="success"
                        onClick={handleSubmit}
                        disabled={submitting || !isValid}
                    >
                        {submitting ? "Saving..." : "Record Payment"}
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
                    Remaining balance: <strong>{remainingBalance.toFixed(2)} AED</strong>.
                    This records a lump-sum payment the employee made outside their normal payroll deduction —
                    it reduces the balance directly and doesn't change or skip the regular monthly EMI.
                </div>

                <div>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: 600, color: "#1f2937" }}>
                        Extra Payment Amount (AED)
                    </label>
                    <input
                        type="number"
                        min="0"
                        max={remainingBalance}
                        value={extraPaymentAmount}
                        onChange={(e) => setExtraPaymentAmount(e.target.value)}
                        className="form-control"
                        style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                    />
                    {amountValue > 0 && (
                        <div style={{ marginTop: "8px", fontSize: "13px", color: willFullyClear ? "#166534" : "#6b7280" }}>
                            {willFullyClear
                                ? "This fully clears the remaining balance — the loan will be marked as completed."
                                : `Balance after this payment: ${remainingAfter.toFixed(2)} AED.`}
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
