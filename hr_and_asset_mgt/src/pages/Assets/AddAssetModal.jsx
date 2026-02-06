

import React, { useState, useEffect } from "react";
import { getEmployees } from "../../services/employeeService.js";
import { assetTypeService, assetCategoryService }
  from "../../services/masterService";

import "../../style/AddEmployeeModal.css";


export default function AddAssetModal({
  onClose,
  onAddAsset,
  onUpdateAsset,
  asset = null,
}) {
  const isEditMode = !!asset;

  const [employees, setEmployees] = useState([]);
  const [assetTypes, setAssetTypes] = useState([]);
  const [categories, setCategories] = useState([]);

  const [form, setForm] = useState({
    name: "",
    serialNumber: "",
    type: "",
    category: "",
    location: "",
    subLocation: "",
    custodian: "",
    department: "",
    purchaseCost: "",
    purchaseDate: "",
    warrantyPeriod: "",
    serviceDueDate: "",
    status: "Available",
  });

  /* -------------------- LOAD MASTERS & EMPLOYEES -------------------- */
  useEffect(() => {
    fetchEmployees();
    fetchMasters();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await getEmployees();
      setEmployees(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error("Failed to fetch employees", error);
    }
  };

  const fetchMasters = async () => {
    try {
      const [typesRes, categoriesRes] = await Promise.all([
        assetTypeService.getAll(),
        assetCategoryService.getAll(),
      ]);

      setAssetTypes(Array.isArray(typesRes) ? typesRes : []);
      setCategories(Array.isArray(categoriesRes) ? categoriesRes : []);
    } catch (error) {
      console.error("Failed to fetch asset masters", error);
    }
  };

  /* -------------------- PREFILL FORM (EDIT MODE) -------------------- */
  useEffect(() => {
    if (!asset) return;

    setForm({
      name: asset.name || "",
      serialNumber: asset.serialNumber || "",
      type: asset.type?._id || asset.type || "",
      category: asset.category?._id || asset.category || "",
      location: asset.location || "",
      subLocation: asset.subLocation || "",
      custodian: asset.custodian?._id || "",
      department: asset.department || "",
      purchaseCost: asset.purchaseCost || "",
      purchaseDate: asset.purchaseDate
        ? new Date(asset.purchaseDate).toISOString().split("T")[0]
        : "",
      warrantyPeriod: asset.warrantyPeriod || "",
      serviceDueDate: asset.serviceDueDate
        ? new Date(asset.serviceDueDate).toISOString().split("T")[0]
        : "",
      status: asset.status || "Available",
    });
  }, [asset]);

  /* -------------------- FORM HANDLERS -------------------- */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: name === "purchaseCost" ? parseFloat(value) || "" : value,
    });
  };

  const handleSubmit = () => {
    const { name, type, category, location, purchaseCost, purchaseDate } = form;

    if (!name || !type || !category || !location || !purchaseCost || !purchaseDate) {
      alert("Please fill all required fields");
      return;
    }

    if (isNaN(purchaseCost) || purchaseCost <= 0) {
      alert("Purchase cost must be a valid positive number");
      return;
    }

    if (form.warrantyPeriod && (isNaN(form.warrantyPeriod) || form.warrantyPeriod <= 0)) {
      alert("Warranty period must be a valid positive number");
      return;
    }

    const submitData = {
      name: form.name,
      serialNumber: form.serialNumber || null,
      type: form.type,           // Master ID
      category: form.category,   // Master ID
      location: form.location,
      subLocation: form.subLocation || null,
      department: form.department || null,
      purchaseCost: Number(form.purchaseCost),
      purchaseDate: form.purchaseDate,
      warrantyPeriod: form.warrantyPeriod ? Number(form.warrantyPeriod) : null,
      serviceDueDate: form.serviceDueDate || null,
      status: form.status,
    };

    if (isEditMode) {
      onUpdateAsset({ ...submitData, _id: asset._id });
    } else {
      onAddAsset(submitData);
    }
  };

  /* -------------------- UI -------------------- */
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEditMode ? "Edit Asset" : "Add Asset"}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="modal-grid">

            <input name="name" placeholder="Asset Name *" value={form.name} onChange={handleChange} />
            <input name="serialNumber" placeholder="Serial Number" value={form.serialNumber} onChange={handleChange} />

            {/* Asset Type (MASTER) */}
            {/* Asset Type (MASTER) */}
            <div style={{ gridColumn: 'span 1' }}>
              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  backgroundColor: 'white',
                  fontSize: '14px',
                  height: '42px'
                }}
              >
                <option value="">Select Asset Type *</option>
                {assetTypes.map(t => (
                  <option key={t._id || t.name} value={t.name}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* Category (MASTER) */}
            <div style={{ gridColumn: 'span 1' }}>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  backgroundColor: 'white',
                  fontSize: '14px',
                  height: '42px'
                }}
              >
                <option value="">Select Category *</option>
                {categories.map(c => (
                  <option key={c._id || c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <input name="location" placeholder="Location *" value={form.location} onChange={handleChange} />
            <input name="subLocation" placeholder="Sub Location" value={form.subLocation} onChange={handleChange} />

            {/* Custodian */}
            <div style={{ gridColumn: 'span 1' }}>
              <select
                name="custodian"
                value={form.custodian}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  backgroundColor: 'white',
                  fontSize: '14px',
                  height: '42px'
                }}
              >
                <option value="">-- Select Custodian (Optional) --</option>
                {employees.map(emp => (
                  <option key={emp._id} value={emp._id}>
                    {`${emp.name} (${emp.code}) - ${emp.department}`}
                  </option>
                ))}
              </select>
            </div>

            <input name="department" placeholder="Department" value={form.department} onChange={handleChange} />
            <input name="purchaseCost" type="number" placeholder="Purchase Cost (AED) *" value={form.purchaseCost} onChange={handleChange} />

            <div style={{ gridColumn: 'span 1' }}>
              <input
                type="date"
                name="purchaseDate"
                value={form.purchaseDate}
                onChange={handleChange}
                placeholder="Purchase Date *"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  height: '42px'
                }}
              />
            </div>

            <input name="warrantyPeriod" type="number" placeholder="Warranty Period (Years)" value={form.warrantyPeriod} onChange={handleChange} />

            <div style={{ gridColumn: 'span 1' }}>
              <input
                type="date"
                name="serviceDueDate"
                value={form.serviceDueDate}
                onChange={handleChange}
                placeholder="Service Due Date"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  height: '42px'
                }}
              />
            </div>

            {isEditMode && (
              <div style={{ gridColumn: 'span 1' }}>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    backgroundColor: 'white',
                    fontSize: '14px',
                    height: '42px'
                  }}
                >
                  <option value="Available">Available</option>
                  <option value="In Use">In Use</option>
                  <option value="Under Maintenance">Under Maintenance</option>
                  <option value="Disposed">Disposed</option>
                </select>
              </div>
            )}
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
