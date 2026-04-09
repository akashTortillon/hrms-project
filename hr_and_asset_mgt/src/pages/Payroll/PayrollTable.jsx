import React, { useState, useEffect } from "react";
import "../../style/Payroll.css";
import PayslipModal from "./PayslipModal";
import AdjustmentModal from "./AdjustmentModal";
import CTCModal from "./CTCModal.jsx";
import { toast } from "react-toastify";
import { payrollService } from "../../services/payrollService";

export default function PayrollEmployeesTable({ employees = [], loading, onRefresh, isFinalized, onExport, activeTab, setActiveTab, companies = [] }) {
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);
  const [showCtcModal, setShowCtcModal] = useState(false);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const toggleMenu = (e, id) => {
    e.stopPropagation();
    setActiveMenu(activeMenu === id ? null : id);
  };

  const handleAdjust = (record = null) => {
    setAdjustTarget(record);
    setShowAdjustModal(true);
    setActiveMenu(null);
  };

  const handleViewCtc = (record) => {
    setSelectedRecord(record);
    setShowCtcModal(true);
    setActiveMenu(null);
  };

  const handleRemove = async (record) => {
    if (window.confirm(`Are you sure you want to remove ${record.employee?.name} from this payroll?`)) {
      try {
        await payrollService.removePayrollItem(record._id);
        toast.success("Employee removed from payroll");
        onRefresh && onRefresh();
      } catch (err) {
        toast.error("Failed to remove employee");
      }
    }
  };

  const handleView = (record) => {
    setSelectedRecord(record);
    setShowModal(true);
    setActiveMenu(null);
  };

  return (
    <>
      <div className="payroll-list-table-wrapper">
        <table className="payroll-modern-table">
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
            {loading ? (
              <tr><td colSpan="6" className="text-center p-4">Loading...</td></tr>
            ) : employees.length === 0 ? (
              <tr><td colSpan="6" className="text-center p-4">No records found.</td></tr>
            ) : employees.map((record) => (
              <tr key={record._id}>
                <td>
                  <div className="p-emp-name">{record.employee?.name || "Unknown"}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{record.employee?.code}</div>
                </td>
                <td className="p-salary">{(record.basicSalary || 0).toLocaleString()} AED</td>
                <td style={{ color: '#10b981' }}>+{(record.totalAllowances || 0).toLocaleString()} AED</td>
                <td style={{ color: '#f43f5e' }}>-{(record.totalDeductions || 0).toLocaleString()} AED</td>
                <td className="p-salary" style={{ fontWeight: '700' }}>{(record.netSalary || 0).toLocaleString()} AED</td>
                <td style={{ position: 'relative' }}>
                   <button className="action-dots-btn" onClick={(e) => toggleMenu(e, record._id)}>
                     &#8942;
                   </button>
                   {activeMenu === record._id && (
                     <div className="p-action-dropdown">
                        <button onClick={() => handleView(record)}>View Details</button>
                        <button onClick={() => handleAdjust(record)}>
                           {isFinalized ? 'View Adjustments' : 'Adjustments'}
                        </button>
                        <button onClick={() => handleViewCtc(record)}>View CTC</button>
                        {!isFinalized && (
                           <button className="delete" onClick={() => handleRemove(record)}>Remove</button>
                        )}
                     </div>
                   )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PayslipModal
        show={showModal}
        onClose={() => setShowModal(false)}
        record={selectedRecord}
        companies={companies}
      />

      <AdjustmentModal
        show={showAdjustModal}
        onClose={() => setShowAdjustModal(false)}
        employees={employees}
        initialRecord={adjustTarget}
        onSuccess={onRefresh}
        isFinalized={isFinalized}
      />

      <CTCModal
        show={showCtcModal}
        onClose={() => setShowCtcModal(false)}
        record={selectedRecord}
      />
    </>
  );
}
