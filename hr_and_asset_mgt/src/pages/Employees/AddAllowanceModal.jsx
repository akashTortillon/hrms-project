import React, { useEffect, useState } from "react";
import "../../style/AddEmployeeModal.css";
import { getSettings } from "../../services/systemSettingsService";

export default function AddAllowanceModal({ employee, onClose, onConfirm, submitting = false }) {
  const [allowanceTypes, setAllowanceTypes] = useState([]);
  const [typeName, setTypeName] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    getSettings()
      .then((data) => setAllowanceTypes(data?.allowanceTypes || []))
      .catch(() => setAllowanceTypes([]));
  }, []);

  const currentAmount = Number(
    (employee?.allowances || []).find((item) => item.typeName === typeName)?.amount || 0
  );
  const parsedAmount = Number(amount || 0);
  const newAmount = currentAmount + (Number.isFinite(parsedAmount) ? parsedAmount : 0);

  const handleSubmit = () => {
    onConfirm({ typeName, amount: parsedAmount });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3>Add / Increase Allowance</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="modal-grid">
            <div className="form-group full-width" style={{ gridColumn: "1 / -1" }}>
              <label>Allowance Type</label>
              <select value={typeName} onChange={(event) => setTypeName(event.target.value)}>
                <option value="">Select allowance type</option>
                {allowanceTypes.map((allowanceType) => (
                  <option key={allowanceType._id} value={allowanceType.name}>
                    {allowanceType.name}
                  </option>
                ))}
              </select>
            </div>

            {typeName && (
              <div className="form-group full-width" style={{ gridColumn: "1 / -1", fontSize: "13px", color: "#6b7280" }}>
                Current amount: {currentAmount.toLocaleString()} AED
              </div>
            )}

            <div className="form-group full-width" style={{ gridColumn: "1 / -1" }}>
              <label>Amount to Add (AED)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
              />
            </div>

            {typeName && (
              <div className="form-group full-width" style={{ gridColumn: "1 / -1", fontSize: "13px", color: "#6b7280" }}>
                New amount: {newAmount.toLocaleString()} AED
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={submitting || !typeName || !parsedAmount || parsedAmount <= 0}
          >
            {submitting ? "Saving..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
