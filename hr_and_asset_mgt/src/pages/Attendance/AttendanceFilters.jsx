import "../../style/Attendance.css";

export default function AttendanceFilters({
  viewMode,
  selectedDate,
  onDateChange,
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  departments = [],
  shifts = [],
  selectedDepartment,
  setSelectedDepartment,
  selectedShift,
  setSelectedShift,
  showDepartmentFilter = true,
  showShiftFilter = true,
  // New Props
  searchQuery,
  setSearchQuery,
  selectedStatus,
  setSelectedStatus
}) {
  return (
    <div className="attendance-filters">
      {viewMode === "day" ? (
        /* DAILY VIEW FILTER */
        <div className="filter-group">
          <label className="filter-label">Date</label>
          <div className="filter-input-wrapper">
            <input
              type="date"
              className="filter-input"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              placeholder="Select Date"
            />
          </div>
        </div>
      ) : (
        /* MONTHLY VIEW FILTERS */
        <>
          <div className="filter-group">
            <label className="filter-label">Month</label>
            <select
              className="filter-input filter-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(0, i).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label">Year</label>
            <select
              className="filter-input filter-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </>
      )}

      {showDepartmentFilter && (
        <div className="filter-group">
          <label className="filter-label">Department</label>
          <select
            className="filter-input filter-select"
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
          >
            <option value="">All Departments</option>
            {departments.map(dept => (
              <option key={dept.name} value={dept.name}>{dept.name}</option>
            ))}
          </select>
        </div>
      )}

      {showShiftFilter && (
        <div className="filter-group">
          <label className="filter-label">Shift</label>
          <select
            className="filter-input filter-select"
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value)}
          >
            <option value="">All Shifts</option>
            {shifts.map(shift => (
              <option key={shift.name} value={shift.name}>{shift.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* NEW: Status Filter */}
      {viewMode === "day" && (
        <div className="filter-group">
          <label className="filter-label">Status</label>
          <select
            className="filter-input filter-select"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Present">Present</option>
            <option value="Absent">Absent</option>
            <option value="Late">Late</option>
            <option value="On Leave">On Leave</option>
          </select>
        </div>
      )}

      {/* NEW: Search Filter */}
      {viewMode === "day" && (
        <div className="filter-group">
          <label className="filter-label">Search</label>
          <input
            type="text"
            className="filter-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Name/ID..."
          />
        </div>
      )}
    </div>
  );
}
