import "../../style/AttendanceEditModal.css";

// Read-only breakdown of every raw punch for one employee+day, shown when a Daily
// Attendance row is flagged hasMultiplePunches (more than a simple check-in+check-out
// pair - e.g. the employee left for a break and came back). Reuses the
// .attendance-modal-overlay/.attendance-modal chrome from AttendanceEditModal.css but
// drops the editable form fields for a simple chronological list.
export default function AttendancePunchDetailsModal({ isOpen, onClose, loading, data }) {
  if (!isOpen) return null;

  return (
    <div className="attendance-modal-overlay">
      <div className="attendance-modal">
        <h2>
          Punch Details{data ? ` – ${data.employeeName}` : ""}
        </h2>
        {data && <p style={{ margin: "-8px 0 16px", color: "#6b7280" }}>{data.date} · {data.punchCount} punches</p>}

        {loading ? (
          <div style={{ padding: "20px 0", textAlign: "center" }}>Loading...</div>
        ) : (
          <div className="modal-grid" style={{ gridTemplateColumns: "1fr" }}>
            {(data?.punches || []).map((p, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  background: i % 2 === 0 ? "#f9fafb" : "transparent",
                  fontSize: "14px"
                }}
              >
                <span>{p.label}</span>
                <strong>
                  {p.time}
                  {p.nextDay && <span className="next-day-badge">Next day</span>}
                </strong>
              </div>
            ))}
          </div>
        )}

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
