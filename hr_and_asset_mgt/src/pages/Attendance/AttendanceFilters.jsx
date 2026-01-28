
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
  showShiftFilter = true
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
              <option key={dept._id || dept.name} value={dept.name}>{dept.name}</option>
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
              <option key={shift._id || shift.name} value={shift.name}>{shift.name}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
