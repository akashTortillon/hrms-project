import React, { useState } from "react";
import "../../style/Payroll.css";
import PayslipModal from "./PayslipModal";
import AdjustmentModal from "./AdjustmentModal";

export default function PayrollEmployeesTable({ employees = [], onRefresh }) {
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleView = (record) => {
    setSelectedRecord(record);
    setShowModal(true);
    setActiveMenu(null);
  };

  const handleAdjust = (record = null) => {
    setAdjustTarget(record);
    setShowAdjustModal(true);
    setActiveMenu(null);
  };

  const toggleMenu = (e, id) => {
    e.stopPropagation(); // Prevent document click from closing immediately
    setActiveMenu(activeMenu === id ? null : id);
  };

  return (
    <>
      <div className="payroll-table-card">
        {/* Header */}
        <div className="payroll-table-header">
          <h3>Employee Payroll Details</h3>

          <div className="payroll-table-actions">
            <button className="outline-btn" onClick={() => handleAdjust(null)}>Add Adjustments</button>
          </div>
        </div>

        {/* Table */}
        <table className="payroll-table">
          <thead>
            <tr>
              <th>EMPLOYEE</th>
              <th>BASIC SALARY</th>
              <th>ALLOWANCES</th>
              <th>DEDUCTIONS</th>
              <th>NET SALARY</th>
              <th className="actions-col">ACTIONS</th>
            </tr>
          </thead>

          <tbody>
            {employees.length === 0 ? (
              <tr><td colSpan="6" className="text-center py-6 text-gray-500">No payroll records found. Click to generate.</td></tr>
            ) : employees.map((record) => (
              <tr key={record._id}>
                {/* Employee */}
                <td>
                  <div className="payroll-employee-cell">
                    <div className="employee-name">{record.employee?.name || "Unknown"}</div>
                    <div className="employee-meta">
                      {record.employee?.code} • {record.employee?.department || record.employee?.designation}
                    </div>
                  </div>
                </td>

                <td>{record.basicSalary?.toLocaleString()} AED</td>

                <td className="amount-positive" style={{ color: "green" }}>
                  +{record.totalAllowances?.toLocaleString()} AED
                </td>

                <td className="amount-negative" style={{ color: "red" }}>
                  -{record.totalDeductions?.toLocaleString()} AED
                </td>

                <td className="amount-net">
                  {record.netSalary?.toLocaleString()} AED
                </td>

                <td className="actions-col">
                  <div className="action-menu-container">
                    <button className="action-toggle-btn" onClick={(e) => toggleMenu(e, record._id)}>
                      &#8942;
                    </button>
                    {activeMenu === record._id && (
                      <div className="action-dropdown-menu">
                        <button className="action-menu-item" onClick={() => handleView(record)}>
                          View Details
                        </button>
                        <button className="action-menu-item" onClick={() => handleAdjust(record)}>
                          Add Adjustment
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      <PayslipModal
        show={showModal}
        onClose={() => setShowModal(false)}
        record={selectedRecord}
      />

      {/* Adjustment Modal */}
      <AdjustmentModal
        show={showAdjustModal}
        onClose={() => setShowAdjustModal(false)}
        employees={employees}
        initialRecord={adjustTarget}
        onSuccess={onRefresh}
      />
    </>
  );
}
