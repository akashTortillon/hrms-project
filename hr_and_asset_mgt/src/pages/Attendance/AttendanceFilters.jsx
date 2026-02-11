import "../../style/Attendance.css";
import CustomSelect from "../../components/reusable/CustomSelect";
import CustomDatePicker from "../../components/reusable/CustomDatePicker";


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
                      <CustomDatePicker
            name="attendanceDate"
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
            <CustomSelect
              name="month"
              value={selectedMonth}
              onChange={(val) => setSelectedMonth(Number(val))}
              options={Array.from({ length: 12 }, (_, i) => ({
                value: i + 1,
                label: new Date(0, i).toLocaleString("default", { month: "long" })
              }))}
            />
          </div>
          <div className="filter-group">
            <label className="filter-label">Year</label>
            <CustomSelect
              name="year"
              value={selectedYear}
              onChange={(val) => setSelectedYear(Number(val))}
              options={[2024, 2025, 2026, 2027].map(y => ({
                value: y,
                label: y
              }))}
            />
          </div>
        </>
      )}

      {showDepartmentFilter && (
        <div className="filter-group">
          <label className="filter-label">Department</label>
          <CustomSelect
            name="department"
            value={selectedDepartment}
            placeholder="All Departments"
            onChange={(val) => setSelectedDepartment(val)}
            options={[
              { value: "", label: "All Departments" },
              ...departments.map(dept => ({
                value: dept.name,
                label: dept.name
              }))
            ]}
          />
        </div>
      )}

      {showShiftFilter && (
        <div className="filter-group">
          <label className="filter-label">Shift</label>
          <CustomSelect
            name="shift"
            value={selectedShift}
            placeholder="All Shifts"
            onChange={(val) => setSelectedShift(val)}
            options={[
              { value: "", label: "All Shifts" },
              ...shifts.map(shift => ({
                value: shift.name,
                label: shift.name
              }))
            ]}
          />
        </div>
      )}
    </div>
  );
}
