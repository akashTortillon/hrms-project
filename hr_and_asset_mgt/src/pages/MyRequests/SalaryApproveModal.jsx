import { useState, useEffect } from "react";
import AppButton from "../../components/reusable/Button.jsx";
import CustomModal from "../../components/reusable/CustomModal.jsx";
import { repaymentPeriodService } from "../../services/masterService.js";

export default function SalaryApproveModal({ show, request, onClose, onApprove }) {
    const [tenure, setTenure] = useState(1);
    const [amount, setAmount] = useState(0);
    const [approving, setApproving] = useState(false);
    const [startCurrentCycle, setStartCurrentCycle] = useState(false);
    const [repaymentPeriods, setRepaymentPeriods] = useState([]);

    const fallbackPeriods = [
        { _id: "fallback-1", name: "1 Month", metadata: { months: 1 } },
        { _id: "fallback-3", name: "3 Months", metadata: { months: 3 } },
        { _id: "fallback-6", name: "6 Months", metadata: { months: 6 } },
        { _id: "fallback-12", name: "12 Months", metadata: { months: 12 } }
    ];

    const periodOptions = repaymentPeriods.length > 0 ? repaymentPeriods : fallbackPeriods;
    const getPeriodMonths = (period) => {
        const months = Number(period.metadata?.months ?? period.value ?? parseInt(period.name, 10));
        return Number.isFinite(months) && months > 0 ? months : 1;
    };

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
        const fetchRepaymentPeriods = async () => {
            try {
                const data = await repaymentPeriodService.getAll();
                setRepaymentPeriods(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error("Failed to fetch repayment periods:", error);
                setRepaymentPeriods([]);
            }
        };
        fetchRepaymentPeriods();
    }, []);

    useEffect(() => {
        if (request && request.details) {
            setAmount(parseFloat(request.details.amount) || 0);
            setTenure(parseInt(request.details.repaymentPeriod) || 1);
            setStartCurrentCycle(false);
        }
    }, [request]);

    const handleSubmit = async () => {
        try {
            setApproving(true);
            await onApprove(request._id, {
                amount: parseFloat(amount),
                repaymentPeriod: isLoan ? parseInt(tenure) : 1,
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

    const calculateMonthly = () => {
        const total = parseFloat(calculateTotal());
        const months = parseInt(tenure) || 1;
        return (total / months).toFixed(2);
    };

    if (!request) return null;

    const isLoan = request.details?.subType === 'loan' || request.subType === 'loan';
    const typeLabel = isLoan ? "Loan" : "Salary Advance";
    const isFinanceStage = request.currentApprovalStage === "FINANCE";
    const stageLabel = isFinanceStage ? "Finance Confirmation (Level 1)" : "HR Final Approval";

    // Footer Actions
    const modalFooter = (
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', width: '100%' }}>
            <AppButton variant="secondary" onClick={onClose}>
                Cancel
            </AppButton>
            <AppButton variant="success" onClick={handleSubmit} disabled={approving}>
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
                    Reviewing request from <strong>{request.userId?.name}</strong> for <strong>{amount} AED</strong>.
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
                            Requested Amount: {request.details.amount} AED. You may modify this value as needed.
                        </small>
                    </div>

                    {/* Tenure (Loans Only) */}
                    {isLoan && (
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                                Approved Tenure (Months)
                            </label>
                            <select
                                className="form-control"
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    border: '1px solid #ced4da',
                                    borderRadius: '4px',
                                    backgroundColor: '#fff'
                                }}
                                value={tenure}
                                onChange={(e) => setTenure(e.target.value)}
                            >
                                {periodOptions.map((period) => {
                                    const months = getPeriodMonths(period);
                                    return (
                                        <option key={period._id || period.name} value={months}>
                                            {period.name || `${months} Month${months > 1 ? "s" : ""}`}
                                        </option>
                                    );
                                })}
                            </select>
                            <small style={{ color: '#6c757d', display: 'block', marginTop: '4px' }}>
                                Requested: {request.details.repaymentPeriod || 'N/A'}
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
                                    <strong style={{ color: '#0d6efd' }}>{calculateMonthly()} / month</strong>
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
                        background: '#fffaf0'
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
