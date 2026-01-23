
import React from "react";
import { useNavigate } from "react-router-dom";
import SvgIcon from "../../components/svgIcon/svgView.jsx";
import "../../style/Employees.css";

import { useRole } from "../../contexts/RoleContext";

export default function EmployeesTable({ employees = [], onEdit, onDelete }) {
  const navigate = useNavigate();
  const { hasPermission } = useRole();

  return (
    <div className="employees-table-card">
      <table className="employees-table">
        <thead>
          <tr>
            <th>EMPLOYEE</th>
            <th>DEPARTMENT</th>
            <th>CONTACT</th>
            <th>JOIN DATE</th>
            <th>STATUS</th>
            {hasPermission("MANAGE_EMPLOYEES") && <th className="actions-col">ACTIONS</th>}
          </tr>
        </thead>

        <tbody>
          {employees.map((emp) => (
            <tr key={emp.id}>
              {/* Employee */}
              <td>
                <div
                  className="employee-cell"
                  onClick={() => navigate(`/app/employees/${emp.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="employee-avatar">
                    {emp.name.charAt(0)}
                  </div>
                  <div>
                    <div className="employee-name">{emp.name}</div>
                    <div className="employee-id">{emp.code}</div>
                  </div>
                </div>
              </td>

              {/* Department */}
              <td>
                <div className="department-title">{emp.role}</div>
                <div className="department-name">{emp.department}</div>
              </td>

              {/* Contact */}
              <td>
                <div className="contact-email">{emp.email}</div>
                <div className="contact-phone">{emp.phone}</div>
              </td>

              {/* Join Date */}
              <td className="join-date">{emp.joinDate}</td>

              {/* Status */}
              <td>
                <span
                  className={`status-pill ${emp.status
                    .toLowerCase()
                    .replace(" ", "-")}`}
                >
                  {emp.status}
                </span>
              </td>

              {/* Actions */}
              {hasPermission("MANAGE_EMPLOYEES") && (
                <td className="actions-col">
                  <div className="actions-btn">
                    <button
                      type="button"
                      className="icon-btn delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete && onDelete(emp);
                      }}
                      title="Delete Employee"
                    >
                      <SvgIcon name="delete" size={18} />
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}

        </tbody>
      </table>
    </div>
  );
}
