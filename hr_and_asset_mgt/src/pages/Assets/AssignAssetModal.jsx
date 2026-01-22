import React, { useState, useEffect } from "react";
import "../../style/AddEmployeeModal.css";
import "../../style/AddEmployeeModal.css";
import { getEmployees } from "../../services/employeeService.js";
import { getDepartments } from "../../services/masterService.js";

export default function AssignAssetModal({ onClose, onAssign, asset }) {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [custodianType, setCustodianType] = useState("EMPLOYEE"); // EMPLOYEE or DEPARTMENT
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [empRes, deptRes] = await Promise.all([
          getEmployees(),
          getDepartments()
        ]);
        setEmployees(Array.isArray(empRes) ? empRes : []);
        setDepartments(Array.isArray(deptRes) ? deptRes : []);
      } catch (error) {
        console.error("Failed to fetch data", error);
      }
    };
    fetchData();
  }, []);


  const handleSubmit = () => {
    if (custodianType === "EMPLOYEE" && !selectedEmployee) {
      alert("Please select an employee");
      return;
    }
    if (custodianType === "DEPARTMENT" && !selectedDepartment) {
      alert("Please select a department");
      return;
    }

    onAssign({
      assetId: asset._id || asset.id,
      custodianType,
      toEmployee: custodianType === "EMPLOYEE" ? selectedEmployee : null,
      toDepartment: custodianType === "DEPARTMENT" ? selectedDepartment : null,
      remarks: remarks
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Assign Asset</h3>
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
                Assign To
              </label>
              <div style={{ display: "flex", gap: "15px", marginBottom: "15px" }}>
                <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="custodianType"
                    value="EMPLOYEE"
                    checked={custodianType === "EMPLOYEE"}
                    onChange={() => setCustodianType("EMPLOYEE")}
                    style={{ marginRight: "6px" }}
                  />
                  Employee
                </label>
                <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="custodianType"
                    value="DEPARTMENT"
                    checked={custodianType === "DEPARTMENT"}
                    onChange={() => setCustodianType("DEPARTMENT")}
                    style={{ marginRight: "6px" }}
                  />
                  Department
                </label>
              </div>

              {custodianType === "EMPLOYEE" ? (
                <>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
                    Select Employee *
                  </label>
                  <select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #d1d5db" }}
                  >
                    <option value="">Choose an employee...</option>
                    {employees.map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.name} ({emp.code}) - {emp.department}
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
                    Select Department *
                  </label>
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #d1d5db" }}
                  >
                    <option value="">Choose a department...</option>
                    {departments.map((dept) => (
                      <option key={dept._id} value={dept.name}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </>
              )}
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
            Assign Asset
          </button>
        </div>
      </div>
    </div>
  );
}
