import { useState } from "react";
import CustomModal from "../../components/reusable/CustomModal.jsx";
import AppButton from "../../components/reusable/Button.jsx";
import "../../style/Modal.css";

export default function DocumentRejectModal({ show, request, onClose, onReject }) {
  const [rejectionReason, setRejectionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    setSubmitting(true);
    try {
      await onReject(request._id, rejectionReason);
      setRejectionReason("");
      onClose();
    } catch (error) {
      console.error('Rejection failed:', error);
      alert('Failed to reject request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setRejectionReason("");
    onClose();
  };

  if (!show || !request) return null;

  return (
    <CustomModal
      show={show}
      title="Reject Document Request"
      onClose={handleClose}
      footer={
        <div style={{ display: 'flex', gap: '12px' }}>
          <AppButton
            variant="secondary"
            onClick={handleClose}
            disabled={submitting}
          >
            Cancel
          </AppButton>
          <AppButton
            variant="danger"
            onClick={handleReject}
            disabled={!rejectionReason.trim() || submitting}
          >
            {submitting ? 'Rejecting...' : 'Confirm Reject'}
          </AppButton>
        </div>
      }
    >
      <div style={{ padding: '20px 0' }}>
        {/* Request Summary */}
        <div style={{
          backgroundColor: '#fef2f2',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #fecaca'
        }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#333' }}>Request Summary</h4>
          <div style={{ display: 'grid', gap: '8px' }}>
            <div><strong>Employee:</strong> {request.userId?.name || 'N/A'}</div>
            <div><strong>Document Type:</strong> {request.documentType}</div>
            <div><strong>Purpose:</strong> {request.details?.purpose || 'N/A'}</div>
            <div><strong>Submitted:</strong> {new Date(request.submittedAt).toLocaleDateString()}</div>
          </div>
        </div>

        {/* Rejection Reason */}
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: 'bold', 
            color: '#333' 
          }}>
            Rejection Reason <span style={{ color: '#dc3545' }}>*</span>
          </label>
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Please provide a reason for rejecting this document request..."
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px',
              fontFamily: 'Arial, sans-serif',
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
          />
          <div style={{ 
            fontSize: '12px', 
            color: '#666', 
            marginTop: '4px' 
          }}>
            This reason will be communicated to the employee.
          </div>
        </div>
      </div>
    </CustomModal>
  );
}
