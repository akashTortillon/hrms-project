
import React from "react";
import SvgIcon from "../../components/svgIcon/svgView.jsx";
import "../../style/Employees.css";

export default function EmployeesTable({ employees = [], onEdit }) {
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
            <th className="actions-col">ACTIONS</th>
          </tr>
        </thead>

        <tbody>
          {employees.map((emp) => (
            <tr key={emp.id}>
              {/* Employee */}
              <td>
                <div className="employee-cell">
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
              <td className="actions-col">
                <div className="actions-btn">
                    <button
                      type="button"
                      className="icon-btn edit-btn"
                      onClick={() => onEdit && onEdit(emp)}
                      title="Edit Employee"
                    >
                      <SvgIcon name="edit" size={18} />
                    </button>

                    <button
                      type="button"
                      // className="icon-btn delete-btn"
                      // onClick={() => onDelete && onDelete(emp)}
                      // title="Delete Employee"
                    >
                      <SvgIcon name="delete" size={18} />
                    </button>
                  </div>
              </td>
            </tr>
          ))}
          
        </tbody>
      </table>
    </div>
  );
}
