import { useState, useEffect } from "react";
import AppButton from "../../components/reusable/Button.jsx";
import CustomModal from "../../components/reusable/CustomModal.jsx";

export default function LeaveApproveModal({ show, request, onClose, onApprove }) {
    const [approvedDays, setApprovedDays] = useState(0);
    const [approving, setApproving] = useState(false);

    useEffect(() => {
        if (request && request.details) {
            setApprovedDays(request.details.numberOfDays || 0);
        }
    }, [request]);

    const handleSubmit = async () => {
        try {
            setApproving(true);
            await onApprove(request._id, {
                approvedDays: parseFloat(approvedDays)
            });
        } catch (error) {
            console.error("Leave approval failed:", error);
        } finally {
            setApproving(false);
        }
    };

    if (!request) return null;

    const isHalfDay = Boolean(request.details?.isHalfDay);
    const requestedDays = request.details?.numberOfDays || 0;
    const daysChanged = !isHalfDay && Number(approvedDays) !== Number(requestedDays);

    const modalFooter = (
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', width: '100%' }}>
            <AppButton variant="secondary" onClick={onClose}>
                Cancel
            </AppButton>
            <AppButton variant="success" onClick={handleSubmit} disabled={approving || (!isHalfDay && !(parseFloat(approvedDays) > 0))}>
                {approving ? "Processing..." : "Confirm Approval"}
            </AppButton>
        </div>
    );

    return (
        <CustomModal
            show={show}
            title="HR Approval — Leave Request"
            onClose={onClose}
            footer={modalFooter}
        >
            <div style={{ padding: '4px' }}>
                <div className="alert alert-info" style={{
                    backgroundColor: '#cff4fc',
                    color: '#055160',
                    padding: '12px',
                    borderRadius: '4px',
                    marginBottom: '16px',
                    border: '1px solid #b6effb'
                }}>
                    Reviewing <strong>{request.details?.leaveType}</strong> request from <strong>{request.userId?.name}</strong>,{" "}
                    {request.details?.fromDate} to {request.details?.toDate} ({requestedDays} day{requestedDays === 1 ? "" : "s"} requested).
                </div>

                {isHalfDay ? (
                    <div style={{ color: '#6b7280', fontSize: '13px', marginBottom: '8px' }}>
                        This is a half-day request — the day count isn't adjustable.
                    </div>
                ) : (
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                            Approved Days
                        </label>
                        <input
                            type="number"
                            min="0"
                            step="1"
                            className="form-control"
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                border: '1px solid #ced4da',
                                borderRadius: '4px'
                            }}
                            value={approvedDays}
                            onChange={(e) => setApprovedDays(e.target.value)}
                        />
                        <small style={{ color: '#6c757d', display: 'block', marginTop: '4px' }}>
                            Requested: {requestedDays} day{requestedDays === 1 ? "" : "s"}. Reduce this for a partial
                            approval — the attendance range and leave-balance deduction will be adjusted to match.
                        </small>
                        {daysChanged && (
                            <div style={{
                                marginTop: '10px',
                                padding: '10px 12px',
                                borderRadius: '8px',
                                background: '#fffaf0',
                                border: '1px solid #fde68a',
                                color: '#92400e',
                                fontSize: '13px'
                            }}>
                                Approving {approvedDays} of {requestedDays} requested day{requestedDays === 1 ? "" : "s"}.
                                The leave dates on this request will be shortened to match.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </CustomModal>
    );
}
