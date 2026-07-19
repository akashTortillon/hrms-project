import React, { useState } from "react";
import "../../style/AddEmployeeModal.css";

export default function ConfirmProbationModal({ employee, onClose, onConfirm, submitting = false }) {
  const [remarks, setRemarks] = useState("");

  const handleSubmit = () => {
    onConfirm({ remarks });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3>Confirm Probation</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="modal-grid">
            <div className="form-group full-width" style={{ gridColumn: "1 / -1", marginBottom: "6px" }}>
              <h4 style={{ margin: 0, fontSize: "16px", color: "#1f2937" }}>
                {employee?.name} ({employee?.code})
              </h4>
              <div style={{ fontSize: "13px", color: "#7d8797", marginTop: "6px" }}>
                Probation end date: {employee?.probationEndDate ? new Date(employee.probationEndDate).toISOString().split("T")[0] : "N/A"}
              </div>
              <div style={{ fontSize: "13px", color: "#7d8797", marginTop: "4px" }}>
                Fixed increment: {employee?.fixedProbationIncrementAmount ? `${employee.fixedProbationIncrementAmount} AED` : "0 AED"}
              </div>
            </div>

            <div className="form-group full-width" style={{ gridColumn: "1 / -1" }}>
              <label>Remarks</label>
              <textarea
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
                placeholder="Optional remarks for probation confirmation"
                rows={4}
                style={{
                  width: "100%",
                  borderRadius: "12px",
                  border: "1px solid #e6e8ef",
                  padding: "12px 14px",
                  background: "linear-gradient(180deg, #ffffff 0%, #fbfbfd 100%)",
                  resize: "vertical",
                  minHeight: "110px",
                  fontSize: "14px",
                  boxSizing: "border-box"
                }}
              />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Confirming..." : "Confirm Probation"}
          </button>
        </div>
      </div>
    </div>
  );
}
