import { useState, useEffect } from "react";
import AppButton from "../../components/reusable/Button.jsx";
import CustomModal from "../../components/reusable/CustomModal.jsx";

export default function SalaryApproveModal({ show, request, onClose, onApprove }) {
    const [interestRate, setInterestRate] = useState(0);
    const [tenure, setTenure] = useState(1);
    const [amount, setAmount] = useState(0);
    const [approving, setApproving] = useState(false);

    useEffect(() => {
        if (request && request.details) {
            setAmount(parseFloat(request.details.amount) || 0);
            setTenure(parseInt(request.details.repaymentPeriod) || 1);

            // Reset interest to 0 on new request open
            setInterestRate(0);
        }
    }, [request]);

    const handleSubmit = async () => {
        try {
            setApproving(true);
            await onApprove(request._id, {
                interestRate: parseFloat(interestRate),
                repaymentPeriod: parseInt(tenure)
            });
        } catch (error) {
            console.error("Approval failed:", error);
        } finally {
            setApproving(false);
        }
    };

    const calculateTotal = () => {
        const rate = parseFloat(interestRate) || 0;
        const principal = parseFloat(amount) || 0;
        const total = principal + (principal * rate / 100);
        return total.toFixed(2);
    };

    const calculateMonthly = () => {
        const total = parseFloat(calculateTotal());
        const months = parseInt(tenure) || 1;
        return (total / months).toFixed(2);
    };

    if (!request) return null;

    const isLoan = request.details?.subType === 'loan';
    const typeLabel = isLoan ? "Loan" : "Salary Advance";

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
            title={`Approve ${typeLabel}`}
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
                    marginBottom: '20px',
                    border: '1px solid #b6effb'
                }}>
                    Reviewing request from <strong>{request.userId?.name}</strong> for <strong>{amount} AED</strong>.
                </div>

                {/* Form Content */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    {/* Tenure */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                            Approved Tenure (Months)
                        </label>
                        <input
                            type="number"
                            min="1"
                            className="form-control"
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                border: '1px solid #ced4da',
                                borderRadius: '4px'
                            }}
                            value={tenure}
                            onChange={(e) => setTenure(e.target.value)}
                        />
                        <small style={{ color: '#6c757d', display: 'block', marginTop: '4px' }}>
                            Requested: {request.details.repaymentPeriod} months
                        </small>
                    </div>

                    {/* Interest Rate */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                            Interest Rate (%)
                        </label>
                        <input
                            type="number"
                            min="0"
                            step="0.1"
                            className="form-control"
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                border: '1px solid #ced4da',
                                borderRadius: '4px'
                            }}
                            value={interestRate}
                            onChange={(e) => setInterestRate(e.target.value)}
                        />
                        <small style={{ color: '#6c757d', display: 'block', marginTop: '4px' }}>
                            Enter 0 for no interest.
                        </small>
                    </div>

                    {/* Calculations Summary */}
                    <div style={{
                        backgroundColor: '#f8f9fa',
                        padding: '16px',
                        borderRadius: '8px',
                        marginTop: '8px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span>Principal Amount:</span>
                            <strong>{amount.toFixed(2)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span>Total Repayment (inc. Interest):</span>
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
                    </div>

                </div>
            </div>
        </CustomModal>
    );
}
