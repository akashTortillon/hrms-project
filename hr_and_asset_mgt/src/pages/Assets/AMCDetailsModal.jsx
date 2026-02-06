import React, { useState, useEffect } from "react";
import "../../style/AddEmployeeModal.css";
import { vendorService } from "../../services/masterService.js";


export default function AMCDetailsModal({ onClose, onSave, asset }) {
  const [form, setForm] = useState({
    provider: "",
    contractNumber: "",
    startDate: "",
    endDate: "",
    cost: "",
    coverageDetails: "",
    status: "Active"
  });
  const [vendors, setVendors] = useState([]);

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const data = await vendorService.getAll();
      setVendors(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch vendors", error);
    }
  };

  useEffect(() => {
    if (asset?.amcDetails) {
      const amc = asset.amcDetails;
      setForm({
        provider: amc.provider || "",
        contractNumber: amc.contractNumber || "",
        startDate: amc.startDate ? new Date(amc.startDate).toISOString().split('T')[0] : "",
        endDate: amc.endDate ? new Date(amc.endDate).toISOString().split('T')[0] : "",
        cost: amc.cost || "",
        coverageDetails: amc.coverageDetails || "",
        status: amc.status || "Active"
      });
    }
  }, [asset]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: name === "cost" ? parseFloat(value) || "" : value
    });
  };

  const handleSubmit = () => {
    const { provider, startDate, endDate } = form;

    if (!provider || !startDate || !endDate) {
      alert("Please fill all required fields: Provider, Start Date, and End Date");
      return;
    }

    // Validate dates
    if (new Date(startDate) >= new Date(endDate)) {
      alert("End date must be after start date");
      return;
    }

    // Validate cost if provided
    if (form.cost && (isNaN(form.cost) || form.cost < 0)) {
      alert("Cost must be a valid positive number");
      return;
    }

    onSave({
      assetId: asset._id || asset.id,
      ...form
    });
  };

  const hasExistingAMC = asset?.amcDetails?.provider;

  // Calculate days until expiry
  const getDaysUntilExpiry = () => {
    if (!form.endDate) return null;
    const today = new Date();
    const endDate = new Date(form.endDate);
    const diffTime = endDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntilExpiry = getDaysUntilExpiry();

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{hasExistingAMC ? "Update" : "Add"} AMC Details</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
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

            {/* Status Alert */}
            {daysUntilExpiry !== null && (
              <div style={{
                padding: "12px",
                borderRadius: "8px",
                background: daysUntilExpiry < 0 ? "#fef2f2" : daysUntilExpiry <= 30 ? "#fffbeb" : "#f0fdf4",
                border: `1px solid ${daysUntilExpiry < 0 ? "#fecaca" : daysUntilExpiry <= 30 ? "#fef3c7" : "#bbf7d0"}`
              }}>
                <div style={{
                  fontSize: "13px",
                  fontWeight: "500",
                  color: daysUntilExpiry < 0 ? "#dc2626" : daysUntilExpiry <= 30 ? "#f59e0b" : "#16a34a"
                }}>
                  {daysUntilExpiry < 0
                    ? `⚠️ AMC Expired ${Math.abs(daysUntilExpiry)} days ago`
                    : daysUntilExpiry <= 30
                      ? `⚠️ AMC Expiring in ${daysUntilExpiry} days`
                      : `✓ AMC Valid for ${daysUntilExpiry} days`
                  }
                </div>
              </div>
            )}

            {/* Provider */}
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
                Service Provider *
              </label>
              <select
                name="provider"
                value={form.provider}
                onChange={handleChange}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  backgroundColor: "white",
                  fontSize: "14px",
                  height: "42px"
                }}
              >
                <option value="">Choose a service provider...</option>
                {vendors.map(vendor => (
                  <option key={vendor._id || vendor.name} value={vendor.name}>{vendor.name}</option>
                ))}
              </select>
            </div>

            {/* Contract Number */}
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
                Contract Number
              </label>
              <input
                type="text"
                name="contractNumber"
                placeholder="AMC contract reference number"
                value={form.contractNumber}
                onChange={handleChange}
              />
            </div>

            {/* Start Date */}
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
                Start Date *
              </label>
              <input
                type="date"
                name="startDate"
                value={form.startDate}
                onChange={handleChange}
                placeholder="Select Start Date"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                  height: "42px"
                }}
              />
            </div>

            {/* End Date */}
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
                End Date *
              </label>
              <input
                type="date"
                name="endDate"
                value={form.endDate}
                onChange={handleChange}
                min={form.startDate}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                  height: "42px"
                }}
              />
            </div>

            {/* Cost */}
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
                AMC Cost (AED)
              </label>
              <input
                type="number"
                name="cost"
                placeholder="Annual maintenance contract cost"
                value={form.cost}
                onChange={handleChange}
                min="0"
                step="0.01"
              />
            </div>

            {/* Status */}
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
                Status
              </label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  backgroundColor: "white",
                  fontSize: "14px",
                  height: "42px"
                }}
              >
                <option value="Active">Active</option>
                <option value="Expired">Expired</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            {/* Coverage Details */}
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
                Coverage Details
              </label>
              <textarea
                name="coverageDetails"
                value={form.coverageDetails}
                onChange={handleChange}
                placeholder="What services are covered under this AMC?"
                rows="4"
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
            {hasExistingAMC ? "Update AMC" : "Add AMC"}
          </button>
        </div>
      </div>
    </div>
  );
}