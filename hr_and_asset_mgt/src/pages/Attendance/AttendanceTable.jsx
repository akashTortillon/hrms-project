
import SvgIcon from "../../components/svgIcon/svgView.jsx";
import "../../style/Attendance.css";

export default function AttendanceTable({ date, records = [] }) {
  return (
    <div className="attendance-table-card">
      {/* Header */}
      <div className="attendance-table-header">
        <h3>Attendance Records - {date}</h3>
        <button className="mark-all-btn">Mark All Present</button>
      </div>

      {/* Table */}
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
          {records.map((row) => (
            <tr key={row.id}>
              {/* Employee */}
              <td>
                <div className="attendance-employee-cell">
                  <SvgIcon
                    name={row.icon}
                    size={18}
                    color={row.iconColor}
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
              <td>{row.workHours || "-"}</td>

              <td>
                <span className={`status-pill ${row.statusClass}`}>
                  {row.status}
                </span>
              </td>

              <td className="actions-col">
                <button className="edit-link">Edit</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
