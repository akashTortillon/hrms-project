import { useEffect, useState } from "react";
import CustomModal from "../../components/reusable/CustomModal.jsx";
import AppButton from "../../components/reusable/Button.jsx";

export default function AddExistingLoanModal({ show, onClose, onSubmit, submitting = false }) {
    const [subType, setSubType] = useState("loan");
    const [amount, setAmount] = useState("");
    const [monthlyRepaymentAmount, setMonthlyRepaymentAmount] = useState("");
    const [repaymentPeriod, setRepaymentPeriod] = useState("");
    const [originDate, setOriginDate] = useState("");
    const [alreadyRepaid, setAlreadyRepaid] = useState("");
    const [reason, setReason] = useState("");

    useEffect(() => {
        if (show) {
            setSubType("loan");
            setAmount("");
            setMonthlyRepaymentAmount("");
            setRepaymentPeriod("");
            setOriginDate("");
            setAlreadyRepaid("");
            setReason("");
        }
    }, [show]);

    const isValid = parseFloat(amount) > 0
        && parseFloat(monthlyRepaymentAmount) > 0
        && parseInt(repaymentPeriod, 10) > 0
        && !!originDate;

    const handleSubmit = async () => {
        if (!isValid) return;
        await onSubmit({
            subType,
            amount: parseFloat(amount),
            monthlyRepaymentAmount: parseFloat(monthlyRepaymentAmount),
            repaymentPeriod: parseInt(repaymentPeriod, 10),
            originDate,
            alreadyRepaid: parseFloat(alreadyRepaid) || 0,
            reason: reason.trim() || undefined
        });
    };

    if (!show) return null;

    return (
        <CustomModal
            show={show}
            title="Add Existing Loan"
            onClose={onClose}
            footer={(
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", width: "100%" }}>
                    <AppButton variant="secondary" onClick={onClose}>
                        Cancel
                    </AppButton>
                    <AppButton
                        variant="primary"
                        onClick={handleSubmit}
                        disabled={submitting || !isValid}
                    >
                        {submitting ? "Saving..." : "Add Loan"}
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
                    For a loan/advance that was already active before this employee was onboarded into HRMS.
                    It's added directly as active — no manager/finance/HR approval step, since none actually
                    happened for a loan that predates the system.
                </div>

                <div>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: 600, color: "#1f2937" }}>
                        Type
                    </label>
                    <div style={{ display: "flex", gap: "16px" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <input
                                type="radio"
                                name="existingLoanSubType"
                                value="loan"
                                checked={subType === "loan"}
                                onChange={(e) => setSubType(e.target.value)}
                            />
                            Loan Application
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <input
                                type="radio"
                                name="existingLoanSubType"
                                value="salary_advance"
                                checked={subType === "salary_advance"}
                                onChange={(e) => setSubType(e.target.value)}
                            />
                            Salary Advance
                        </label>
                    </div>
                </div>

                <div>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: 600, color: "#1f2937" }}>
                        Original Amount (AED) <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <input
                        type="number"
                        min="0"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="form-control"
                        style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                    />
                </div>

                <div>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: 600, color: "#1f2937" }}>
                        Monthly Repayment Amount (AED) <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <input
                        type="number"
                        min="0"
                        value={monthlyRepaymentAmount}
                        onChange={(e) => setMonthlyRepaymentAmount(e.target.value)}
                        className="form-control"
                        style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                    />
                </div>

                <div>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: 600, color: "#1f2937" }}>
                        Repayment Period (months) <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <input
                        type="number"
                        min="1"
                        value={repaymentPeriod}
                        onChange={(e) => setRepaymentPeriod(e.target.value)}
                        className="form-control"
                        style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                    />
                </div>

                <div>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: 600, color: "#1f2937" }}>
                        Loan Origin Date <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <input
                        type="date"
                        value={originDate}
                        onChange={(e) => setOriginDate(e.target.value)}
                        className="form-control"
                        style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                    />
                    <div style={{ marginTop: "6px", fontSize: "13px", color: "#6b7280" }}>
                        The real-world date this loan was taken, before HRMS onboarding.
                    </div>
                </div>

                <div>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: 600, color: "#1f2937" }}>
                        Already Repaid Before Onboarding (AED)
                    </label>
                    <input
                        type="number"
                        min="0"
                        value={alreadyRepaid}
                        onChange={(e) => setAlreadyRepaid(e.target.value)}
                        className="form-control"
                        style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                    />
                    <div style={{ marginTop: "6px", fontSize: "13px", color: "#6b7280" }}>
                        Optional. Recorded as a single labeled extra payment, netted out of the remaining balance immediately.
                    </div>
                </div>

                <div>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: 600, color: "#1f2937" }}>
                        Notes
                    </label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={3}
                        placeholder="Optional context for the audit trail"
                        className="form-control"
                        style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #d1d5db", resize: "vertical" }}
                    />
                </div>
            </div>
        </CustomModal>
    );
}
