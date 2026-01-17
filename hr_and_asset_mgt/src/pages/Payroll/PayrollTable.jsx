
import React, { useState } from "react";
import "../../style/Payroll.css";
import PayslipModal from "./PayslipModal";

export default function PayrollEmployeesTable({ employees = [] }) {
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const handleView = (record) => {
    setSelectedRecord(record);
    setShowModal(true);
  };

  return (
    <>
      <div className="payroll-table-card">
        {/* Header */}
        <div className="payroll-table-header">
          <h3>Employee Payroll Details</h3>

          <div className="payroll-table-actions">
            {/* <button className="outline-btn">Import Attendance</button> */}
            <button className="outline-btn">Add Adjustments</button>
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
                  <button className="view-link" onClick={() => handleView(record)}>View Details</button>
                </td>
              </tr>
            ))}

            {/* Can re-enable total row if needed later */}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      <PayslipModal
        show={showModal}
        onClose={() => setShowModal(false)}
        record={selectedRecord}
      />
    </>
  );
}
