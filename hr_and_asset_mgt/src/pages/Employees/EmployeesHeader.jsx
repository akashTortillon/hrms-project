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

        <button className="employees-add-btn" onClick={onAddEmployee}>
          <SvgIcon name="plus" size={16} />
          Add Employee
        </button>
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
          <select
            className="employees-select"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            <option value="All Departments">All Departments</option>
            {deptOptions.map((dept, idx) => (
              <option key={idx} value={dept}>{dept}</option>
            ))}
          </select>

          {/* Status */}
          <select
            className="employees-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option>All Status</option>
            <option>Active</option>
            <option>Inactive</option>
            <option>On Leave</option>
          </select>

          {/* Export */}
          <button className="employees-export-btn" onClick={onExport}>
            <SvgIcon name="download" size={16} />
            Export
          </button>
        </div>

        <div className="employees-count">
          Showing {count} Employees
        </div>
      </div>
    </div>
  );
}
