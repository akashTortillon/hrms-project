import SvgIcon from "../../components/svgIcon/svgView.jsx";
import "../../style/Attendance.css";
import CircleLoader from "../../components/reusable/CircleLoader.jsx";


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
    const safeStatus = status || "Absent";
    switch (safeStatus) {
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
                <tr><td colSpan={daysInMonth + 2} className="text-center p-4">
<div style={{ minHeight: "100vh", display: "flex" }}>
      <CircleLoader size="medium" />
    </div>                  </td></tr>
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
                        <div style={{ color: '#16a34a', fontWeight: 'bold' }}>P: {emp.stats?.present || 0}</div>
                        <div style={{ color: '#dc2626', fontWeight: 'bold' }}>A: {emp.stats?.absent || 0}</div>
                        <div style={{ color: '#d97706', fontWeight: 'bold' }}>L: {emp.stats?.late || 0}</div>
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
                      }

                      // Define styles for the letter itself
                      let color = '#374151'; // default gray
                      let bg = 'transparent';

                      if (status === 'Present') { color = '#16a34a'; bg = '#dcfce7'; }
                      else if (status === 'Absent') { color = '#dc2626'; bg = '#fee2e2'; }
                      else if (status === 'Late') { color = '#d97706'; bg = '#fef3c7'; }
                      else if (status === 'Weekend') { color = '#9ca3af'; bg = '#f3f4f6'; }
                      else if (status === 'Holiday') { color = '#7c3aed'; bg = '#f3e8ff'; }
                      else if (status === 'On Leave') { color = '#ca8a04'; bg = '#fef9c3'; }

                      const abbr = status ? getStatusAbbr(status) : "-";

                      return (
                        <td key={d} className={`status-cell ${isSunday ? 'cell-sunday' : ''}`} style={{ textAlign: 'center', padding: '0' }}>
                          {status && (
                            <div
                              style={{
                                width: '100%', height: '100%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: color,
                                backgroundColor: bg,
                                fontWeight: '600',
                                fontSize: '13px'
                              }}
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

      <div className="table-wrapper">
        <table className="attendance-table">
          <thead>
            <tr>
              <th>EMPLOYEE</th>
              <th>SHIFT</th>
              <th>CHECK IN</th>
              <th>CHECK OUT</th>
              <th>WORK HOURS</th>
              <th>STATUS</th>
              {onEdit && <th className="actions-col">ACTIONS</th>}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={onEdit ? "7" : "6"} style={{ textAlign: "center", padding: "20px" }}>
                  Loading...
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={onEdit ? "7" : "6"} style={{ textAlign: "center", padding: "20px" }}>
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
                        {row.status || "Absent"}
                      </span>
                      {row.isManuallyEdited && (
                        <div
                          className="status-edited"
                          title={`Edited by ${row.editedBy?.name || 'Admin'} on ${new Date(row.editedAt).toLocaleDateString()}. Reason: ${row.editReason}`}
                        >
                          EDITED
                        </div>
                      )}
                      {/* Tooltip for hover is handled by title attribute for simplicity as requested */}
                    </td>

                    {onEdit && (
                      <td className="actions-col">
                        <button
                          className="edit-link"
                          onClick={() => handleEditClick(row)}
                        >
                          Edit
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
