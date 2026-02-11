



import React, { useState, useEffect } from "react";
import "../../style/AddEmployeeModal.css";
import { getEmployees } from "../../services/employeeService.js";
import { maintenanceShopService, getDepartments } from "../../services/masterService.js";
import { getCurrentAssignment } from "../../services/assignmentService.js";
import CustomSelect from "../../components/reusable/CustomSelect.jsx";

export default function TransferAssetModal({ onClose, onTransfer, asset }) {
  const [employees, setEmployees] = useState([]);
  const [maintenanceShops, setMaintenanceShops] = useState([]);
  const [departments, setDepartments] = useState([]); // New department state
  const [toEntityType, setToEntityType] = useState("MAINTENANCE_SHOP");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState(""); // New department selection
  const [selectedShop, setSelectedShop] = useState("");
  const [toStore, setToStore] = useState("");
  const [remarks, setRemarks] = useState("");
  const [currentEmployee, setCurrentEmployee] = useState("");

  useEffect(() => {
    fetchEmployees();
    fetchMaintenanceShops();
    fetchDepartments(); // Fetch departments
    fetchCurrentAssignment();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await getEmployees();
      setEmployees(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error("Failed to fetch employees", error);
    }
  };

  const fetchMaintenanceShops = async () => {
    try {
      const response = await maintenanceShopService.getAll();
      setMaintenanceShops(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error("Failed to fetch maintenance shops", error);
    }
  };

  // New: Fetch Departments
  const fetchDepartments = async () => {
    try {
      const response = await getDepartments();
      setDepartments(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error("Failed to fetch departments", error);
    }
  };

  const fetchCurrentAssignment = async () => {
    try {
      const data = await getCurrentAssignment(asset._id || asset.id);

      if (data?.toEmployee) {
        const emp = data.toEmployee;
        setCurrentEmployee(`${emp.name}${emp.code ? ` (${emp.code})` : ""}`);
      } else {
        setCurrentEmployee("");
      }
    } catch (error) {
      console.error("Failed to fetch current assignment", error);
      setCurrentEmployee("");
    }
  };

  const handleSubmit = () => {
    if (toEntityType === "EMPLOYEE" && !selectedEmployee) {
      alert("Please select an employee");
      return;
    }

    if (toEntityType === "MAINTENANCE_SHOP" && !selectedShop) {
      alert("Please select a maintenance shop");
      return;
    }

    if (toEntityType === "DEPARTMENT" && !selectedDepartment) {
      alert("Please select a department");
      return;
    }

    if (toEntityType === "STORE" && !toStore.trim()) {
      alert("Please enter store name");
      return;
    }

    let actionType;
    if (toEntityType === "MAINTENANCE_SHOP") actionType = "TRANSFER_TO_MAINTENANCE";
    else if (toEntityType === "EMPLOYEE") actionType = "TRANSFER_TO_EMPLOYEE";
    else if (toEntityType === "DEPARTMENT") actionType = "TRANSFER_TO_DEPARTMENT";
    else if (toEntityType === "STORE") actionType = "TRANSFER_TO_STORE";

    const transferData = {
      assetId: asset._id || asset.id,
      toEntityType,
      toEmployee: toEntityType === "EMPLOYEE" ? selectedEmployee : null,
      toDepartment: toEntityType === "DEPARTMENT" ? selectedDepartment : null,
      toStore: toEntityType === "STORE" ? toStore.trim() : null,
      shop: toEntityType === "MAINTENANCE_SHOP" ? selectedShop : null,
      actionType,
      remarks,
    };

    // ✅ CORRECT: delegate API call to parent
    onTransfer(transferData);
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
            <label>Asset</label>
            <input value={asset?.name || ""} disabled />

            <label>Current Employee</label>
            <input value={currentEmployee || "Not assigned"} disabled />

           
            <label>Transfer To *</label>
            <CustomSelect
  value={toEntityType}
  placeholder="Select transfer type"
  options={[
    { value: "MAINTENANCE_SHOP", label: "Maintenance Shop" },
    { value: "EMPLOYEE", label: "Employee" },
    { value: "DEPARTMENT", label: "Department" },
    { value: "STORE", label: "Store" }
  ]}
  onChange={(value) => {
    setToEntityType(value);
    setSelectedEmployee("");
    setSelectedShop("");
    setSelectedDepartment("");
    setToStore("");
  }}
/>
            {toEntityType === "MAINTENANCE_SHOP" && (
              <>
                <label className="d-block mt-3">Select Maintenance Shop *</label>
                <CustomSelect
      value={selectedShop}
      placeholder="Choose a maintenance shop..."
      options={maintenanceShops.map(shop => ({
        value: shop._id,
        label: `${shop.name}${shop.code ? ` (${shop.code})` : ""}`
      }))}
      onChange={(value) => setSelectedShop(value)}
    />
              </>
            )}

            {toEntityType === "EMPLOYEE" && (
              <>
                <label className="d-block mt-3">Select Employee *</label>
                <CustomSelect
      value={selectedEmployee}
      placeholder="Choose an employee..."
      options={employees.map(emp => ({
        value: emp._id,
        label: `${emp.name} (${emp.code})`
      }))}
      onChange={(value) => setSelectedEmployee(value)}
    />
              </>
            )}

            {toEntityType === "DEPARTMENT" && (
              <>
                <label className="d-block mt-3">Select Department *</label>
                <CustomSelect
      value={selectedDepartment}
      placeholder="Choose a department..."
      options={departments.map(dept => ({
        value: dept.name,
        label: dept.name
      }))}
      onChange={(value) => setSelectedDepartment(value)}
    />
              </>
            )}

            {toEntityType === "STORE" && (
              <input value={toStore} onChange={(e) => setToStore(e.target.value)} />
            )}

            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Remarks (optional)"
            />
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose}>Cancel</button>
          <button onClick={handleSubmit}>Transfer Asset</button>
        </div>
      </div>
    </div>
  );
}
