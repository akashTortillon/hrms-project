import { useEffect, useState } from "react";
import CustomModal from "../../components/reusable/CustomModal.jsx";
import AppButton from "../../components/reusable/Button.jsx";

export default function DeleteExtraPaymentModal({ show, request, entry, onClose, onSubmit, submitting = false }) {
    const [reason, setReason] = useState("");

    useEffect(() => {
        if (show) setReason("");
    }, [show, entry?.recordedAt]);

    if (!show || !request || !entry) return null;

    const isValid = reason.trim().length > 0;

    const handleSubmit = async () => {
        if (!isValid) return;
        await onSubmit(request._id, {
            action: "DELETE_EXTRA_PAYMENT",
            extraPaymentRecordedAt: entry.recordedAt,
            reason: reason.trim()
        });
    };

    return (
        <CustomModal
            show={show}
            title="Delete Extra Payment"
            onClose={onClose}
            footer={(
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", width: "100%" }}>
                    <AppButton variant="secondary" onClick={onClose}>
                        Cancel
                    </AppButton>
                    <AppButton variant="danger" onClick={handleSubmit} disabled={submitting || !isValid}>
                        {submitting ? "Deleting..." : "Delete Payment"}
                    </AppButton>
                </div>
            )}
        >
            <div style={{ display: "grid", gap: "16px" }}>
                <div style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: "10px",
                    padding: "14px 16px",
                    color: "#7f1d1d",
                    fontSize: "14px"
                }}>
                    Removing <strong>+{entry.amount} AED</strong> ("{entry.reason}") from loan {request.requestId}.
                    The balance goes back up by this amount and a fully repaid loan is reopened.
                    The deleted entry is kept in the loan's <strong>Log</strong> tab.
                </div>

                <div>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: 600, color: "#1f2937" }}>
                        Reason for deleting <span style={{ color: "#dc2626" }}>*</span>
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
