import { useEffect, useMemo, useState } from "react";
import CustomModal from "../../components/reusable/CustomModal.jsx";
import AppButton from "../../components/reusable/Button.jsx";

const getDefaultMonthValue = () => {
    const base = new Date();
    base.setMonth(base.getMonth() + 1, 1);
    const month = String(base.getMonth() + 1).padStart(2, "0");
    return `${base.getFullYear()}-${month}`;
};

export default function SkipLoanMonthModal({ show, request, onClose, onSubmit, submitting = false }) {
    const [cycle, setCycle] = useState(getDefaultMonthValue());
    const [reason, setReason] = useState("");

    useEffect(() => {
        if (show) {
            setCycle(getDefaultMonthValue());
            setReason("");
        }
    }, [show, request?._id]);

    const selectedCycleLabel = useMemo(() => {
        if (!cycle) return "";
        const [year, month] = cycle.split("-");
        const parsedDate = new Date(Number(year), Number(month) - 1, 1);
        return parsedDate.toLocaleString("en-US", { month: "long", year: "numeric" });
    }, [cycle]);

    const handleSubmit = async () => {
        if (!cycle) return;
        const [year, month] = cycle.split("-");
        await onSubmit(request._id, {
            action: "SKIP_MONTH",
            month: Number(month),
            year: Number(year),
            reason: reason.trim()
        });
    };

    if (!show || !request) return null;

    return (
        <CustomModal
            show={show}
            title="Skip One Deduction Month"
            onClose={onClose}
            footer={(
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", width: "100%" }}>
                    <AppButton variant="secondary" onClick={onClose}>
                        Cancel
                    </AppButton>
                    <AppButton variant="warning" onClick={handleSubmit} disabled={submitting || !cycle}>
                        {submitting ? "Saving..." : "Save Skip"}
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
                    This will skip deduction for one payroll cycle only and resume automatically in the following month.
                </div>

                <div>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: 600, color: "#1f2937" }}>
                        Payroll Cycle
                    </label>
                    <input
                        type="month"
                        value={cycle}
                        min={getDefaultMonthValue()}
                        onChange={(e) => setCycle(e.target.value)}
                        className="form-control"
                        style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                    />
                    {selectedCycleLabel && (
                        <div style={{ marginTop: "8px", fontSize: "13px", color: "#6b7280" }}>
                            The deduction for {selectedCycleLabel} will be skipped.
                        </div>
                    )}
                </div>

                <div>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: 600, color: "#1f2937" }}>
                        Reason
                    </label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={4}
                        placeholder="Optional note for audit trail"
                        className="form-control"
                        style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #d1d5db", resize: "vertical" }}
                    />
                </div>
            </div>
        </CustomModal>
    );
}
