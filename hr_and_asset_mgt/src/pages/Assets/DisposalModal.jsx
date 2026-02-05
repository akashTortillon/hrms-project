import React, { useState } from "react";
import "../../style/AddEmployeeModal.css";
import CustomSelect from "../../components/reusable/CustomSelect";
import CustomDatePicker from "../../components/reusable/CustomDatePicker";

export default function DisposalModal({ onClose, onDispose, asset }) {
  const [form, setForm] = useState({
    disposalDate: new Date().toISOString().split('T')[0],
    disposalMethod: "",
    disposalReason: "",
    disposalValue: "",
    remarks: ""
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: name === "disposalValue" ? parseFloat(value) || "" : value
    });
  };

  const handleSubmit = () => {
    const { disposalDate, disposalMethod, disposalReason } = form;

    if (!disposalDate || !disposalMethod || !disposalReason) {
      alert("Please fill all required fields: Disposal Date, Method, and Reason");
      return;
    }

    // Validate disposal value if provided
    if (form.disposalValue && (isNaN(form.disposalValue) || form.disposalValue < 0)) {
      alert("Disposal value must be a valid positive number");
      return;
    }

    onDispose({
      assetId: asset._id || asset.id,
      ...form
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Dispose Asset</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Warning Banner */}
          <div style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            padding: "12px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "12px"
          }}>
            <div style={{ fontSize: "24px" }}>⚠️</div>
            <div>
              <div style={{ fontWeight: "600", color: "#dc2626", fontSize: "14px" }}>
                Warning: This action cannot be undone
              </div>
              <div style={{ fontSize: "12px", color: "#991b1b", marginTop: "4px" }}>
                The asset will be marked as disposed and removed from active inventory
              </div>
            </div>
          </div>

          <div className="modal-grid" style={{ gridTemplateColumns: "1fr" }}>
            {/* Asset Info */}
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
                Asset
              </label>
              <input
                type="text"
                value={`${asset?.name || ""} (${asset?.code || asset?.assetCode || ""})`}
                disabled
                style={{ opacity: 0.7 }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
                Purchase Cost
              </label>
              <input
                type="text"
                value={`AED ${asset?.purchaseCost?.toLocaleString() || 0}`}
                disabled
                style={{ opacity: 0.7 }}
              />
            </div>

            {/* Disposal Date */}
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
                Disposal Date *
              </label>
              <CustomDatePicker
                name="disposalDate"
                value={form.disposalDate}
                onChange={handleChange}
                maxDate={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Disposal Method */}
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
                Disposal Method *
              </label>
              <CustomSelect
                name="disposalMethod"
                value={form.disposalMethod}
                onChange={(val) => handleChange({ target: { name: 'disposalMethod', value: val } })}
                options={[
                  { value: "", label: "-- Select Method --" },
                  { value: "Sold", label: "Sold" },
                  { value: "Donated", label: "Donated" },
                  { value: "Scrapped", label: "Scrapped" },
                  { value: "Recycled", label: "Recycled" },
                  { value: "Other", label: "Other" }
                ]}
                placeholder="-- Select Method --"
              />
            </div>

            {/* Disposal Value */}
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
                Disposal Value (AED)
              </label>
              <input
                type="number"
                name="disposalValue"
                placeholder="Sale/scrap value (if any)"
                value={form.disposalValue}
                onChange={handleChange}
                min="0"
                step="0.01"
              />
            </div>

            {/* Disposal Reason */}
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
                Disposal Reason *
              </label>
              <textarea
                name="disposalReason"
                value={form.disposalReason}
                onChange={handleChange}
                placeholder="Why is this asset being disposed?"
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

            {/* Additional Remarks */}
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
                Additional Remarks (Optional)
              </label>
              <textarea
                name="remarks"
                value={form.remarks}
                onChange={handleChange}
                placeholder="Any additional notes..."
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
          <button
            className="btn-primary"
            onClick={handleSubmit}
            style={{ backgroundColor: "#dc2626" }}
          >
            Dispose Asset
          </button>
        </div>
      </div>
    </div>
  );
}