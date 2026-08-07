import { useState, useEffect } from "react";
import AppButton from "../../components/reusable/Button.jsx";
import CustomModal from "../../components/reusable/CustomModal.jsx";

export default function SalaryApproveModal({ show, request, onClose, onApprove }) {
    const [monthlyRepaymentAmount, setMonthlyRepaymentAmount] = useState(0);
    const [amount, setAmount] = useState(0);
    const [approving, setApproving] = useState(false);
    const [startCurrentCycle, setStartCurrentCycle] = useState(false);

    const getCycleLabel = (useCurrentCycle) => {
        const base = new Date();
        if (!useCurrentCycle) {
            base.setMonth(base.getMonth() + 1, 1);
        }
        return base.toLocaleString("en-US", {
            month: "long",
            year: "numeric"
        });
    };

    useEffect(() => {
        if (request && request.details) {
            const defaultAmount = request.currentApprovalStage === "HR"
                ? request.details.financeApprovedAmount ?? request.details.amount
                : request.details.amount;
            // Prefer an already-set monthly repayment amount; for a loan that predates this
            // field, derive a starting value from its existing amount/repaymentPeriod so the
            // approver sees something sensible instead of a blank/zero field.
            const existingMonthly = request.currentApprovalStage === "HR"
                ? request.details.financeApprovedMonthlyRepaymentAmount ?? request.details.monthlyRepaymentAmount
                : request.details.monthlyRepaymentAmount;
            const existingPeriod = request.currentApprovalStage === "HR"
                ? request.details.financeApprovedRepaymentPeriod ?? request.details.repaymentPeriod
                : request.details.repaymentPeriod;
            const parsedAmount = parseFloat(defaultAmount) || 0;
            const derivedMonthly = existingMonthly
                ?? (existingPeriod > 0 ? parsedAmount / existingPeriod : 0);

            setAmount(parsedAmount);
            setMonthlyRepaymentAmount(Math.round((derivedMonthly || 0) * 100) / 100);
            setStartCurrentCycle(false);
        }
    }, [request]);

    const handleSubmit = async () => {
        try {
            setApproving(true);
            await onApprove(request._id, {
                amount: parseFloat(amount),
                monthlyRepaymentAmount: isLoan ? parseFloat(monthlyRepaymentAmount) : undefined,
                startCurrentCycle
            });
        } catch (error) {
            console.error("Approval failed:", error);
        } finally {
            setApproving(false);
        }
    };

    const calculateTotal = () => {
        const principal = parseFloat(amount) || 0;
        return principal.toFixed(2);
    };

    // Term is derived from the monthly repayment amount (rounded up, so a smaller final
    // installment absorbs any remainder), not picked directly - mirrors the same
    // Math.ceil the backend uses when it stores the actual repaymentPeriod on approval.
    const calculateTermMonths = () => {
        const total = parseFloat(calculateTotal());
        const monthly = parseFloat(monthlyRepaymentAmount) || 0;
        if (monthly <= 0) return null;
        return Math.ceil(total / monthly);
    };

    if (!request) return null;

    const isLoan = request.details?.subType === 'loan' || request.subType === 'loan';
    const typeLabel = isLoan ? "Loan" : "Salary Advance";
    const isFinanceStage = request.currentApprovalStage === "FINANCE";
    const requestedAmount = request.details?.requestedAmount ?? request.details?.amount;
    const financeApprovedAmount = request.details?.financeApprovedAmount;
    const stageLabel = isFinanceStage ? "Finance Confirmation (Level 1)" : "HR Final Approval";

    // Footer Actions
    const modalFooter = (
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', width: '100%' }}>
            <AppButton variant="secondary" onClick={onClose}>
                Cancel
            </AppButton>
            <AppButton variant="success" onClick={handleSubmit} disabled={approving || (isLoan && !(parseFloat(monthlyRepaymentAmount) > 0))}>
                {approving ? "Processing..." : "Confirm Approval"}
            </AppButton>
        </div>
    );

    return (
        <CustomModal
            show={show}
            title={`${stageLabel} — ${typeLabel}`}
            onClose={onClose}
            footer={modalFooter}
        >
            <div style={{ padding: '4px' }}>
                {/* Info Alert */}
                <div className="alert alert-info" style={{
                    backgroundColor: '#cff4fc',
                    color: '#055160',
                    padding: '12px',
                    borderRadius: '4px',
                    marginBottom: '12px',
                    border: '1px solid #b6effb'
                }}>
                    Reviewing request from <strong>{request.userId?.name}</strong> for <strong>{requestedAmount} AED</strong>.
                    {!isFinanceStage && financeApprovedAmount !== undefined && financeApprovedAmount !== null && (
                        <>
                            {" "}Finance approved <strong>{financeApprovedAmount} AED</strong>.
                        </>
                    )}
                </div>

                {/* Stage badge */}
                <div style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    fontSize: '12px',
                    fontWeight: '600',
                    marginBottom: '16px',
                    background: isFinanceStage ? '#fef3c7' : '#dcfce7',
                    color: isFinanceStage ? '#92400e' : '#166534'
                }}>
                    {isFinanceStage
                        ? '⚡ Step 1 of 2 — Finance must confirm before HR final approval'
                        : '✅ Step 2 of 2 — HR Final Sanction'}
                </div>

                {/* Form Content */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    {/* Approved Amount (Editable Override) */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                            Approved Amount (AED)
                        </label>
                        <input
                            type="number"
                            min="0"
                            className="form-control"
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                border: '1px solid #ced4da',
                                borderRadius: '4px'
                            }}
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                        <small style={{ color: '#6c757d', display: 'block', marginTop: '4px' }}>
                            Requested Amount: {requestedAmount} AED
                            {!isFinanceStage && financeApprovedAmount !== undefined && financeApprovedAmount !== null
                                ? ` | Finance Approved: ${financeApprovedAmount} AED`
                                : ""}. You may modify this value as needed.
                        </small>
                    </div>

                    {/* Monthly Repayment Amount (Loans Only) - term is derived, not picked */}
                    {isLoan && (
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                                Monthly Repayment Amount (AED)
                            </label>
                            <input
                                type="number"
                                min="0"
                                className="form-control"
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    border: '1px solid #ced4da',
                                    borderRadius: '4px'
                                }}
                                value={monthlyRepaymentAmount}
                                onChange={(e) => setMonthlyRepaymentAmount(e.target.value)}
                            />
                            <small style={{ color: '#6c757d', display: 'block', marginTop: '4px' }}>
                                Requested tenure: {request.details.repaymentPeriod || 'N/A'} month(s).
                            </small>
                        </div>
                    )}

                    {/* Calculations Summary */}
                    <div style={{
                        backgroundColor: '#f8f9fa',
                        padding: '16px',
                        borderRadius: '8px',
                        marginTop: '8px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span>Principal Amount:</span>
                            <strong>{parseFloat(amount || 0).toFixed(2)}</strong>
                        </div>
                        {isLoan && (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span>Total Repayment:</span>
                                    <strong>{calculateTotal()}</strong>
                                </div>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    borderTop: '1px solid #dee2e6',
                                    paddingTop: '8px',
                                    marginTop: '8px'
                                }}>
                                    <span>Monthly Deduction:</span>
                                    <strong style={{ color: '#0d6efd' }}>{parseFloat(monthlyRepaymentAmount || 0).toFixed(2)} / month</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                                    <span>Repayment Term:</span>
                                    <strong>{calculateTermMonths() ? `${calculateTermMonths()} month(s)` : 'Enter a monthly amount'}</strong>
                                </div>
                            </>
                        )}
                        {!isLoan && (
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                borderTop: '1px solid #dee2e6',
                                paddingTop: '8px',
                                marginTop: '8px'
                            }}>
                                <span>Advance Deduction:</span>
                                <strong style={{ color: '#dc3545' }}>{parseFloat(amount || 0).toFixed(2)} / cycle</strong>
                            </div>
                        )}
                    </div>

                    <div style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: '10px',
                        padding: '14px 16px',
                        background: '#eef4fc'
                    }}>
                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={startCurrentCycle}
                                onChange={(e) => setStartCurrentCycle(e.target.checked)}
                                style={{ marginTop: '3px' }}
                            />
                            <div>
                                <div style={{ fontWeight: '600', color: '#1f2937' }}>
                                    Start deduction in current payroll cycle
                                </div>
                                <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                                    Leave unchecked to defer the first deduction to {getCycleLabel(false)}.
                                </div>
                                <div style={{ fontSize: '13px', color: '#92400e', marginTop: '6px' }}>
                                    First deduction will start in {getCycleLabel(startCurrentCycle)}.
                                </div>
                            </div>
                        </label>
                    </div>

                </div>
            </div>
        </CustomModal>
    );
}
