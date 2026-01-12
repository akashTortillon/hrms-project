


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

const calculateWorkHours = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return "0h 0m";

  let inMin = toMinutes(checkIn);
  let outMin = toMinutes(checkOut);

  if (inMin === null || outMin === null) return "0h 0m";

  // Midnight rollover
  if (outMin < inMin) {
    outMin += 1440;
  }

  let diff = outMin - inMin;

  // ⛔ subtract 12 hours
  diff -= 720;

  if (diff <= 0) return "0h 0m";

  const h = Math.floor(diff / 60);
  const m = diff % 60;

  return `${h}h ${m}m`;
};

/* =========================
   Component
========================= */

export default function AttendanceTable({ date, records = [], onEdit, loading }) {
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
      case "On Leave":
        return "status-leave";
      case "Present":
      default:
        return "status-present";
    }
  };

  return (
    <div className="attendance-table-card">
      <div className="attendance-table-header">
        <h3>Attendance Records - {date}</h3>
        <button className="mark-all-btn">Mark All Present</button>
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
              const workHours =
                    row.workHours && row.workHours !== "0h 0m"
                      ? row.workHours
                      : calculateWorkHours(row.checkIn, row.checkOut);

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
