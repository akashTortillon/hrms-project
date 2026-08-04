
import React from "react";
import { useNavigate } from "react-router-dom";
import SvgIcon from "../../components/svgIcon/svgView.jsx";
import "../../style/Employees.css";

import { useRole } from "../../contexts/RoleContext";

const resolveUploadedAssetUrl = (url) => {
  if (!url) return "";
  if (/^(https?:)?\/\//i.test(url) || url.startsWith("data:")) return url;

  const apiBase = import.meta.env.VITE_API_BASE || "";
  const serverBase = apiBase.replace(/\/api\/?$/, "").replace(/\/$/, "");
  return `${serverBase}${url.startsWith("/") ? url : `/${url}`}`;
};

export default function EmployeesTable({ employees = [], page = 1, totalPages = 1, onPageChange }) {
  const navigate = useNavigate();
  const { hasPermission } = useRole();

  return (
    <div className="employees-table-card">
      <div className="table-wrapper">
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
            {employees.length > 0 ? (
              employees.map((emp) => (
                <tr key={emp.id}>
                  {/* Employee */}
                  <td>
                    <div
                      className="employee-cell"
                      onClick={() => navigate(`/app/employees/${emp.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="employee-avatar">
                        {emp.profilePhotoUrl ? (
                          <img src={resolveUploadedAssetUrl(emp.profilePhotoUrl)} alt={emp.name} />
                        ) : (
                          emp.name.charAt(0)
                        )}
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
                        {/* <button
                          type="button"
                          className="icon-btn delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete && onDelete(emp);
                          }}
                          title="Delete Employee"
                        >
                          <SvgIcon name="delete" size={18} />
                        </button> */}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={hasPermission("MANAGE_EMPLOYEES") ? 6 : 5} style={{ textAlign: 'center', padding: '20px' }}>
                  No employee available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {onPageChange && totalPages > 1 && (
        <div
          className="employees-pagination"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', padding: '12px 16px' }}
        >
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            Previous
          </button>
          <span style={{ fontSize: '13px', color: '#6b7280' }}>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div >
  );
}
