import React from "react";
import SvgIcon from "../../components/svgIcon/svgView.jsx";
import "../../style/Employees.css";



export default function EmployeesHeader({
  onAddEmployee,
  department,
  setDepartment,
  status,
  setStatus,
  search,
  setSearch,
  deptOptions = [],
  onExport,
  onImport,
  count = 0
}) {
  return (
    <div className="employees-header">
      {/* Page Title */}
      <div className="employees-header-top">
        <div>
          <h2 className="employees-title">Employee Management</h2>
          <p className="employees-subtitle">
            Manage and view all employee information
          </p>
        </div>

        {onAddEmployee && (
          <button className="employees-add-btn" onClick={onAddEmployee}>
            <SvgIcon name="plus" size={16} />
            Add Employee
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="employees-filters-card">
        <div className="employees-filters">
          {/* Search */}
          <div className="employees-search">
            <SvgIcon name="search" size={18} />
            <input
              type="text"
              placeholder="Search by name, ID, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Department */}
          {/* Department */}
          <div style={{ width: '100%' }}>
            <select
              className="employees-select"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                backgroundColor: "white",
                fontSize: "14px",
                height: "42px"
              }}
            >
              <option value="All Departments">All Departments</option>
              {deptOptions.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          {/* Status */}
          <div style={{ width: '100%' }}>
            <select
              className="employees-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                backgroundColor: "white",
                fontSize: "14px",
                height: "42px"
              }}
            >
              <option value="All Status">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="On Leave">On Leave</option>
            </select>
          </div>


          {onImport && (
            <button
              className="employees-export-btn"
              onClick={onImport}
              style={{ marginRight: "10px" }}
            >
              <SvgIcon name="upload" size={16} />
              Import
            </button>
          )}

          {/* Export */}
          {onExport && (
            <button className="employees-export-btn" onClick={onExport}>
              <SvgIcon name="download" size={16} />
              Export
            </button>
          )}
        </div>

        <div className="employees-count">
          Showing {count} Employees
        </div>
      </div>
    </div>
  );
}
