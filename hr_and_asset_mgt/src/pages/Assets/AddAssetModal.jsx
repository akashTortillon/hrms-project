import React, { useState } from "react";
import "../../style/AddEmployeeModal.css";

export default function AddAssetModal({ onClose, onAddAsset }) {
  const [form, setForm] = useState({
    assetCode: "",
    name: "",
    category: "",
    location: "",
    custodian: "",
    purchaseCost: "",
    purchaseDate: "",
    status: "Available",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: name === "purchaseCost" ? parseFloat(value) || "" : value });
  };

  const handleSubmit = () => {
    const { assetCode, name, category, location, custodian, purchaseCost, purchaseDate } = form;

    if (!assetCode || !name || !category || !location || !custodian || !purchaseCost || !purchaseDate) {
      alert("All fields are required");
      return;
    }

    // Validate purchaseCost is a valid number
    if (isNaN(purchaseCost) || purchaseCost <= 0) {
      alert("Purchase cost must be a valid positive number");
      return;
    }

    onAddAsset(form);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add Asset</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="modal-grid">
            <input
              name="assetCode"
              placeholder="Asset Code (e.g., AST001)"
              value={form.assetCode}
              onChange={handleChange}
            />
            <input
              name="name"
              placeholder="Asset Name"
              value={form.name}
              onChange={handleChange}
            />
            <input
              name="category"
              placeholder="Category"
              value={form.category}
              onChange={handleChange}
            />
            <input
              name="location"
              placeholder="Location"
              value={form.location}
              onChange={handleChange}
            />
            <input
              name="custodian"
              placeholder="Custodian"
              value={form.custodian}
              onChange={handleChange}
            />
            <input
              name="purchaseCost"
              type="number"
              placeholder="Purchase Cost (AED)"
              value={form.purchaseCost}
              onChange={handleChange}
              min="0"
              step="0.01"
            />
            <input
              name="purchaseDate"
              type="date"
              placeholder="Purchase Date"
              value={form.purchaseDate}
              onChange={handleChange}
            />
            <select name="status" value={form.status} onChange={handleChange}>
              <option value="Available">Available</option>
              <option value="In Use">In Use</option>
              <option value="Under Maintenance">Under Maintenance</option>
            </select>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit}>
            Add Asset
          </button>
        </div>
      </div>
    </div>
  );
}
