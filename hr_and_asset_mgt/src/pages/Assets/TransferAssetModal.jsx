import React, { useState, useEffect } from "react";
import "../../style/AddEmployeeModal.css";
import { getEmployees } from "../../services/employeeService.js";

export default function TransferAssetModal({ onClose, onTransfer, asset }) {
  const [employees, setEmployees] = useState([]);
  const [toEntityType, setToEntityType] = useState("EMPLOYEE");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [toStore, setToStore] = useState("");
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await getEmployees();
      const employeesArray = Array.isArray(response) ? response : [];
      setEmployees(employeesArray);
    } catch (error) {
      console.error("Failed to fetch employees", error);
    }
  };

  const handleSubmit = () => {
    if (toEntityType === "EMPLOYEE" && !selectedEmployee) {
      alert("Please select an employee");
      return;
    }

    if (toEntityType === "STORE" && !toStore.trim()) {
      alert("Please enter store name");
      return;
    }

    onTransfer({
      assetId: asset._id || asset.id,
      toEntityType,
      toEmployee: toEntityType === "EMPLOYEE" ? selectedEmployee : null,
      toStore: toEntityType === "STORE" ? toStore.trim() : null,
      remarks: remarks
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Transfer Asset</h3>
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
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
                Transfer To *
              </label>
              <select
                value={toEntityType}
                onChange={(e) => {
                  setToEntityType(e.target.value);
                  setSelectedEmployee("");
                  setToStore("");
                }}
                style={{ width: "100%" }}
              >
                <option value="EMPLOYEE">Employee</option>
                <option value="STORE">Store</option>
              </select>
            </div>

            {toEntityType === "EMPLOYEE" ? (
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
                  Select Employee *
                </label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  style={{ width: "100%" }}
                >
                  <option value="">Choose an employee...</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name} ({emp.code}) - {emp.department}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
                  Store Name *
                </label>
                <input
                  type="text"
                  value={toStore}
                  onChange={(e) => setToStore(e.target.value)}
                  placeholder="Enter store name..."
                />
              </div>
            )}

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
            Transfer Asset
          </button>
        </div>
      </div>
    </div>
  );
}
