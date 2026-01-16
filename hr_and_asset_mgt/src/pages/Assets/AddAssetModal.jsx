import React, { useState, useEffect } from "react";
import "../../style/AddEmployeeModal.css";

export default function AddAssetModal({ onClose, onAddAsset, onUpdateAsset, asset = null }) {
  const isEditMode = !!asset;
  
  const [form, setForm] = useState({
    name: "",
    category: "",
    location: "",
    subLocation: "",
    custodian: "",
    department: "",
    purchaseCost: "",
    purchaseDate: "",
    warrantyPeriod: "",
    status: "Available",
  });

  // Pre-fill form if editing
  useEffect(() => {
    if (asset) {
      const purchaseDate = asset.purchaseDate
        ? new Date(asset.purchaseDate).toISOString().split("T")[0]
        : "";
      
      setForm({
        name: asset.name || "",
        category: asset.category || "",
        location: asset.location || "",
        subLocation: asset.subLocation || "",
        custodian: asset.custodian || "",
        department: asset.department || "",
        purchaseCost: asset.purchaseCost || "",
        purchaseDate: purchaseDate,
        warrantyPeriod: asset.warrantyPeriod || "",
        status: asset.status || "Available",
      });
    }
  }, [asset]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: name === "purchaseCost" ? parseFloat(value) || "" : value });
  };

  const handleSubmit = () => {
    const { name, category, location, custodian, purchaseCost, purchaseDate, warrantyPeriod } = form;

    if (!name || !category || !location || !custodian || !purchaseCost || !purchaseDate) {
      alert("All required fields must be provided");
      return;
    }

    // Validate purchaseCost is a valid number
    if (isNaN(purchaseCost) || purchaseCost <= 0) {
      alert("Purchase cost must be a valid positive number");
      return;
    }

    // Validate warranty period is a valid number if provided
    if (warrantyPeriod && (isNaN(warrantyPeriod) || warrantyPeriod <= 0)) {
      alert("Warranty period must be a valid positive number");
      return;
    }

    if (isEditMode && onUpdateAsset) {
      onUpdateAsset({ ...form, _id: asset._id });
    } else {
      onAddAsset(form);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEditMode ? "Edit Asset" : "Add Asset"}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="modal-grid">
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
              placeholder="Location (e.g., Main Office)"
              value={form.location}
              onChange={handleChange}
            />
            <input
              name="subLocation"
              placeholder="Sub Location (e.g., IT Store)"
              value={form.subLocation}
              onChange={handleChange}
            />
            <input
              name="custodian"
              placeholder="Custodian Name"
              value={form.custodian}
              onChange={handleChange}
            />
            <input
              name="department"
              placeholder="Department"
              value={form.department}
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
            <input
              name="warrantyPeriod"
              type="number"
              placeholder="Warranty Period (Years)"
              value={form.warrantyPeriod}
              onChange={handleChange}
              min="0"
              step="1"
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
            {isEditMode ? "Update Asset" : "Add Asset"}
          </button>
        </div>
      </div>
    </div>
  );
}
