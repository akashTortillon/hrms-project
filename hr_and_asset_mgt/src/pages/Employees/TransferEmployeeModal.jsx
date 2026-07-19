import React, { useEffect, useState } from "react";
import { getBranches, getCompanies } from "../../services/masterService";
import "../../style/AddEmployeeModal.css";

export default function TransferEmployeeModal({ employee, onClose, onSubmit }) {
  const [companies, setCompanies] = useState([]);
  const [branches, setBranches] = useState([]);
  const [form, setForm] = useState({
    company: employee?.company || "",
    branch: employee?.branch || "",
    effectiveDate: new Date().toISOString().slice(0, 10),
    reason: ""
  });

  useEffect(() => {
    const loadMasters = async () => {
      try {
        const [branchData, companyData] = await Promise.all([
          getBranches(),
          getCompanies()
        ]);
        setBranches(Array.isArray(branchData) ? branchData : []);
        setCompanies(Array.isArray(companyData) ? companyData : []);
      } catch (error) {
        console.error("Failed to load transfer masters", error);
      }
    };

    loadMasters();
  }, []);

  const handleChange = (event) => {
    setForm((prev) => ({
      ...prev,
      [event.target.name]: event.target.value
    }));
  };

  const handleSubmit = () => {
    if (!form.effectiveDate) {
      alert("Effective date is required");
      return;
    }

    if (form.company === (employee?.company || "") && form.branch === (employee?.branch || "")) {
      alert("Please change branch or company before transferring");
      return;
    }

    onSubmit(form);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3>Transfer Employee</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="modal-grid">
            <div className="form-group full-width" style={{ gridColumn: "1 / -1", marginBottom: "6px" }}>
              <h4 style={{ margin: 0, fontSize: "16px", color: "#1f2937" }}>
                {employee?.name} ({employee?.code})
              </h4>
              <div style={{ fontSize: "13px", color: "#7d8797", marginTop: "6px" }}>
                Current assignment: {employee?.company || "No Company"} • {employee?.branch || "No Branch"}
              </div>
            </div>

            <div className="form-group">
              <label>Transfer To Company</label>
              <select name="company" value={form.company} onChange={handleChange}>
                <option value="">Select Company</option>
                {companies.map((company) => (
                  <option key={company._id || company.name} value={company.name}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Transfer To Branch</label>
              <select name="branch" value={form.branch} onChange={handleChange}>
                <option value="">Select Branch</option>
                {branches.map((branch) => (
                  <option key={branch._id || branch.name} value={branch.name}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Effective Date</label>
              <input type="date" name="effectiveDate" value={form.effectiveDate} onChange={handleChange} />
            </div>

            <div className="form-group full-width" style={{ gridColumn: "1 / -1" }}>
              <label>Reason</label>
              <input
                name="reason"
                value={form.reason}
                onChange={handleChange}
                placeholder="Reason for transfer"
              />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit}>Confirm Transfer</button>
        </div>
      </div>
    </div>
  );
}
