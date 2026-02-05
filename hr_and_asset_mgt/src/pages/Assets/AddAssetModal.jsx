

import React, { useState, useEffect } from "react";
import { getEmployees } from "../../services/employeeService.js";
import { assetTypeService, assetCategoryService }
  from "../../services/masterService";

import "../../style/AddEmployeeModal.css";
import CustomSelect from "../../components/reusable/CustomSelect";
import CustomDatePicker from "../../components/reusable/CustomDatePicker";

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
            <div style={{ gridColumn: 'span 1' }}>
              <CustomSelect
                name="type"
                value={form.type}
                onChange={(val) => handleChange({ target: { name: 'type', value: val } })}
                options={[
                  { value: "", label: "Select Asset Type *" },
                  ...assetTypes.map(t => ({ value: t.name, label: t.name }))
                ]}
                placeholder="Select Asset Type *"
              />
            </div>

            {/* Category (MASTER) */}
            <div style={{ gridColumn: 'span 1' }}>
              <CustomSelect
                name="category"
                value={form.category}
                onChange={(val) => handleChange({ target: { name: 'category', value: val } })}
                options={[
                  { value: "", label: "Select Category *" },
                  ...categories.map(c => ({ value: c.name, label: c.name }))
                ]}
                placeholder="Select Category *"
              />
            </div>

            <input name="location" placeholder="Location *" value={form.location} onChange={handleChange} />
            <input name="subLocation" placeholder="Sub Location" value={form.subLocation} onChange={handleChange} />

            {/* Custodian */}
            <div style={{ gridColumn: 'span 1' }}>
              <CustomSelect
                name="custodian"
                value={form.custodian}
                onChange={(val) => handleChange({ target: { name: 'custodian', value: val } })}
                options={[
                  { value: "", label: "-- Select Custodian (Optional) --" },
                  ...employees.map(emp => ({
                    value: emp._id,
                    label: `${emp.name} (${emp.code}) - ${emp.department}`
                  }))
                ]}
                placeholder="-- Select Custodian (Optional) --"
              />
            </div>

            <input name="department" placeholder="Department" value={form.department} onChange={handleChange} />
            <input name="purchaseCost" type="number" placeholder="Purchase Cost (AED) *" value={form.purchaseCost} onChange={handleChange} />

            <div style={{ gridColumn: 'span 1' }}>
              <CustomDatePicker name="purchaseDate" value={form.purchaseDate} onChange={handleChange} placeholder="Purchase Date *" />
            </div>

            <input name="warrantyPeriod" type="number" placeholder="Warranty Period (Years)" value={form.warrantyPeriod} onChange={handleChange} />

            <div style={{ gridColumn: 'span 1' }}>
              <CustomDatePicker name="serviceDueDate" value={form.serviceDueDate} onChange={handleChange} placeholder="Service Due Date" />
            </div>

            {isEditMode && (
              <div style={{ gridColumn: 'span 1' }}>
                <CustomSelect
                  name="status"
                  value={form.status}
                  onChange={(val) => handleChange({ target: { name: 'status', value: val } })}
                  options={[
                    { value: "Available", label: "Available" },
                    { value: "In Use", label: "In Use" },
                    { value: "Under Maintenance", label: "Under Maintenance" },
                    { value: "Disposed", label: "Disposed" }
                  ]}
                />
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
