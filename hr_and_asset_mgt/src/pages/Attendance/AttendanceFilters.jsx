
import "../../style/Attendance.css";

export default function AttendanceFilters({
  selectedDate,
  onDateChange,
  department,
  onDepartmentChange,
  departmentOptions = [],
  shift,
  onShiftChange,
  shiftOptions = ["All Shifts", "Day Shift", "Night Shift", "Flexible"]
})  {
  return (
    <div className="attendance-filters">
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

      <div className="filter-group">
        <label className="filter-label">Department</label>
        <select
            className="filter-input filter-select"
            value={department}
            onChange={(e) => onDepartmentChange(e.target.value)}
          >
            {departmentOptions.map((dept, idx) => (
              <option key={idx} value={dept}>
                {dept}
              </option>
            ))}
          </select>
      </div>

      <div className="filter-group">
        <label className="filter-label">Shift</label>
        <select 
          className="filter-input filter-select"
          value={shift}
          onChange={(e) => onShiftChange(e.target.value)}
        >
          {shiftOptions.map((shiftOption, idx) => (
            <option key={idx} value={shiftOption}>
              {shiftOption}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
