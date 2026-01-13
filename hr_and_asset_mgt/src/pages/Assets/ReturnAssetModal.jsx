import React, { useState } from "react";
import "../../style/AddEmployeeModal.css";

export default function ReturnAssetModal({ onClose, onReturn, asset }) {
  const [remarks, setRemarks] = useState("");

  const handleSubmit = () => {
    onReturn({
      assetId: asset._id || asset.id,
      remarks: remarks
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Return Asset to Store</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="modal-grid" style={{ gridTemplateColumns: "1fr" }}>
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
                Asset
              </label>
              <input
                type="text"
                value={asset?.name || ""}
                disabled
                style={{ opacity: 0.7 }}
              />
            </div>

            <div>
              <p style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#6b7280" }}>
                Do you want to return this asset to the store?
              </p>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
                Remarks (Optional)
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add any remarks..."
                rows="3"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                  fontFamily: "inherit",
                  resize: "vertical"
                }}
              />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit}>
            Return Asset
          </button>
        </div>
      </div>
    </div>
  );
}
