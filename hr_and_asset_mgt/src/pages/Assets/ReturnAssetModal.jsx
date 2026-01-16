import React, { useState, useEffect } from "react";
import "../../style/AddEmployeeModal.css";
import { getEmployees } from "../../services/employeeService.js";
import { maintenanceShopService } from "../../services/masterService.js";

export default function ReturnAssetModal({ onClose, onReturn, asset }) {
  const [employees, setEmployees] = useState([]);
  const [maintenanceShops, setMaintenanceShops] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState("");
  const [currentMaintenanceShop, setCurrentMaintenanceShop] = useState("");

  useEffect(() => {
    fetchEmployees();
    fetchMaintenanceShops();
    fetchCurrentAssignment();
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

  const fetchMaintenanceShops = async () => {
    try {
      const response = await maintenanceShopService.getAll();
      const shopsArray = Array.isArray(response) ? response : [];
      setMaintenanceShops(shopsArray);
    } catch (error) {
      console.error("Failed to fetch maintenance shops", error);
    }
  };

  const fetchCurrentAssignment = async () => {
    try {
      // Get current assignment to show current maintenance shop
      const response = await fetch(`/api/assets/${asset._id || asset.id}/assignments/current`);
      if (response.ok) {
        const assignment = await response.json();
        if (assignment && assignment.shop) {
          setCurrentMaintenanceShop(`${assignment.shop.name} ${assignment.shop.code ? `(${assignment.shop.code})` : ''}`);
        } else {
          setCurrentMaintenanceShop("");
        }
      } else {
        setCurrentMaintenanceShop("");
      }
    } catch (error) {
      console.error("Failed to fetch current assignment", error);
      setCurrentMaintenanceShop("");
    }
  };

  const handleSubmit = () => {
    if (!selectedEmployee) {
      alert("Please select an employee");
      return;
    }

    onReturn({
      assetId: asset._id || asset.id,
      toEntityType: "EMPLOYEE", 
      toEmployee: selectedEmployee,
      actionType: "RETURN_FROM_MAINTENANCE",
      returnDate: returnDate,
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
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
                Current Maintenance Shop
              </label>
              <input
                type="text"
                value={currentMaintenanceShop || "Not assigned"}
                disabled
                style={{ opacity: 0.7 }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
                Return To Employee *
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

            <div>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
                Return Date *
              </label>
              <input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                style={{ width: "100%" }}
                max={new Date().toISOString().split('T')[0]}
              />
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
