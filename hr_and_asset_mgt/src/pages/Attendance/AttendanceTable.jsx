import SvgIcon from "../../components/svgIcon/svgView.jsx";
import "../../style/Attendance.css";

/* =========================
   Helpers (LOCAL – SAFE)
   ========================= */
const toMinutes = (time) => {
  if (!time || !time.includes(":")) return null;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

/* =========================
   Component
   ========================= */

export default function AttendanceTable({ date, records = [], onEdit, loading, viewMode = "day", daysInMonth, year, month }) {
  const handleEditClick = (row) => {
    if (onEdit) {
      onEdit(row);
    }
  };

  // ✅ STATUS → CLASS mapping
  const getStatusClass = (status) => {
    switch (status) {
      case "Late":
        return "status-late";
      case "Absent":
        return "status-absent";
      case "On Leave": // Match backend enum "On Leave"
        return "status-leave";
      case "Leave": // Fallback
        return "status-leave";
      case "Present":
        return "status-present";
      case "Weekend":
        return "status-weekend"; // New class for Sundays
      case "Holiday":
        return "status-holiday";
      default:
        return "";
    }
  };

  const getStatusAbbr = (status) => {
    if (status === "Present") return "P";
    if (status === "Late") return "L";
    if (status === "Absent") return "A";
    if (status === "On Leave" || status === "Leave") return "OL";
    if (status === "Weekend") return "W";
    if (status === "Holiday") return "H";
    return "-";
  };

  if (viewMode === "month") {
    // Generate days array
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return (
      <div className="attendance-table-card monthly-view">
        <div className="attendance-table-header">
          <h3>Monthly Attendance - {new Date(year, month - 1).toLocaleString('default', { month: 'long' })} {year}</h3>
        </div>

        <div className="table-responsive">
          <table className="attendance-table monthly-table">
            <thead>
              <tr>
                <th className="sticky-col-header">Employee</th>
                <th className="stats-col-header">Stats</th>
                {days.map(d => {
                  const dateObj = new Date(year, month - 1, d);
                  const isSunday = dateObj.getDay() === 0;
                  return (
                    <th key={d} className={`day-col-header ${isSunday ? 'header-sunday' : ''}`}>
                      <div className="day-number">{d}</div>
                      <div className="day-name">{dateObj.toLocaleDateString('en-US', { weekday: 'narrow' })}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={daysInMonth + 2} className="text-center p-4">Loading...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={daysInMonth + 2} className="text-center p-4">No records found</td></tr>
              ) : (
                records.map(emp => (
                  <tr key={emp._id}>
                    <td className="sticky-col-cell">
                      <div className="employee-name">{emp.name}</div>
                      <div className="employee-meta">{emp.code}</div>
                    </td>
                    <td>
                      <div className="stats-cell-content">
                        <div className="stat-item stat-present">P: {emp.stats?.present || 0}</div>
                        <div className="stat-item stat-absent">A: {emp.stats?.absent || 0}</div>
                        <div className="stat-item stat-late">L: {emp.stats?.late || 0}</div>
                      </div>
                    </td>
                    {days.map(d => {
                      // Construct key yyyy-mm-dd
                      const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                      const record = emp.attendance[dateKey] || {};
                      let status = record.status;

                      // Check for Sunday
                      const dateObj = new Date(year, month - 1, d);
                      const isSunday = dateObj.getDay() === 0;

                      if (isSunday) {
                        status = "Weekend";
                      } else if (!status) {
                        // If not Sunday and no record, default to Absent if past date? 
                        // For now let's leave it empty or handled by backend 'Absent'. 
                        // The backend usually fills 'Absent'.
                      }

                      const abbr = status ? getStatusAbbr(status) : "";
                      const cls = status ? getStatusClass(status) : "";

                      return (
                        <td key={d} className={`status-cell ${isSunday ? 'cell-sunday' : ''}`}>
                          {status && (
                            <div
                              className={`status-badge ${cls}`}
                              title={`${dateKey}: ${status} ${record.checkIn ? `(${record.checkIn} - ${record.checkOut})` : ''}`}
                            >
                              {abbr}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // DAILY VIEW
  return (
    <div className="attendance-table-card">
      <div className="attendance-table-header">
        <h3>Attendance Records - {date}</h3>
      </div>

      <table className="attendance-table">
        <thead>
          <tr>
            <th>EMPLOYEE</th>
            <th>SHIFT</th>
            <th>CHECK IN</th>
            <th>CHECK OUT</th>
            <th>WORK HOURS</th>
            <th>STATUS</th>
            <th className="actions-col">ACTIONS</th>
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <tr>
              <td colSpan="7" style={{ textAlign: "center", padding: "20px" }}>
                Loading...
              </td>
            </tr>
          ) : records.length === 0 ? (
            <tr>
              <td colSpan="7" style={{ textAlign: "center", padding: "20px" }}>
                No employees found
              </td>
            </tr>
          ) : (
            records.map((row) => {
              const workHours = row.workHours && row.workHours !== "0h 0m" ? row.workHours : "0h 0m";

              return (
                <tr key={row.id || row.employeeId}>
                  <td>
                    <div className="attendance-employee-cell">
                      <SvgIcon
                        name={row.icon || "user"}
                        size={18}
                        color={row.iconColor || "#6b7280"}
                      />
                      <div>
                        <div className="employee-name">{row.name}</div>
                        <div className="employee-meta">
                          {row.code} • {row.department}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td>{row.shift}</td>
                  <td>{row.checkIn || "-"}</td>
                  <td>{row.checkOut || "-"}</td>
                  <td>{workHours}</td>

                  <td>
                    <span
                      className={`status-pill ${getStatusClass(row.status)}`}
                    >
                      {row.status}
                    </span>
                  </td>

                  <td className="actions-col">
                    <button
                      className="edit-link"
                      onClick={() => handleEditClick(row)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
