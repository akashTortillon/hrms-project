import React from "react";
import SvgIcon from "../../components/svgIcon/svgView.jsx";
import "../../style/Employees.css";
import CustomSelect from "../../components/reusable/CustomSelect";



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
             <CustomSelect
                value={department}
                onChange={setDepartment}
                placeholder="All Departments"
                options={[
                  { value: 'All Departments', label: 'All Departments' },
                  ...deptOptions.map(dept => ({
                    value: dept,
                    label: dept
                  }))
                ]}
              />
          </div>

          
          {/* Status */}
          <div style={{ width: '100%' }}>
              <CustomSelect
              value={status}
              onChange={setStatus}
              placeholder="All Status"
              options={[
                { value: 'All Status', label: 'All Status' },
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
                { value: 'On Leave', label: 'On Leave' }
              ]}
            />
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
