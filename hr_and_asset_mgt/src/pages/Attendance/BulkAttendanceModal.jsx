import React, { useState, useEffect } from "react";
import { getEmployees } from "../../services/employeeService.js";
import { markAttendanceBulk } from "../../services/attendanceService.js";
import { toast } from "react-toastify";

export default function BulkAttendanceModal({ isOpen, onClose, onSuccess }) {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({
    employeeId: "",
    fromDate: "",
    toDate: "",
    status: "Present",
    checkIn: "",
    checkOut: "",
    shift: "Day Shift",
    reason: "",
    skipWeekends: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getEmployees()
        .then((res) => setEmployees(Array.isArray(res) ? res : []))
        .catch(() => setEmployees([]));
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async () => {
    if (!form.employeeId || !form.fromDate || !form.toDate) {
      toast.error("Employee, From Date and To Date are required");
      return;
    }
    if (new Date(form.toDate) < new Date(form.fromDate)) {
      toast.error("To Date must be on or after From Date");
      return;
    }
    try {
      setSaving(true);
      const res = await markAttendanceBulk(form);
      toast.success(res.message || `Attendance marked for ${res.count} day(s)`);
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to mark bulk attendance");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const inputStyle = {
    width: "100%",
    padding: "9px 12px",
    borderRadius: "8px",
    border: "1px solid #d1d5db",
    fontSize: "14px",
    height: "40px",
    boxSizing: "border-box",
  };

  const labelStyle = {
    display: "block",
    fontSize: "13px",
    fontWeight: "600",
    color: "#374151",
    marginBottom: "5px",
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
        zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "white", borderRadius: "12px", padding: "28px",
          width: "100%", maxWidth: "520px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#111827" }}>
            Mass Attendance — Date Range
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#6b7280" }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Employee */}
          <div>
            <label style={labelStyle}>Employee *</label>
            <select name="employeeId" value={form.employeeId} onChange={handleChange} style={inputStyle}>
              <option value="">Select Employee</option>
              {employees.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.name} ({e.code}) — {e.department}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={labelStyle}>From Date *</label>
              <input type="date" name="fromDate" value={form.fromDate} onChange={handleChange} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>To Date *</label>
              <input type="date" name="toDate" value={form.toDate} onChange={handleChange} style={inputStyle} />
            </div>
          </div>

          {/* Status */}
          <div>
            <label style={labelStyle}>Attendance Status</label>
            <select name="status" value={form.status} onChange={handleChange} style={inputStyle}>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="On Leave">On Leave</option>
              <option value="Late">Late</option>
            </select>
          </div>

          {/* Check In / Out */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={labelStyle}>Check In (optional)</label>
              <input type="time" name="checkIn" value={form.checkIn} onChange={handleChange} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Check Out (optional)</label>
              <input type="time" name="checkOut" value={form.checkOut} onChange={handleChange} style={inputStyle} />
            </div>
          </div>

          {/* Shift */}
          <div>
            <label style={labelStyle}>Shift</label>
            <select name="shift" value={form.shift} onChange={handleChange} style={inputStyle}>
              <option value="Day Shift">Day Shift</option>
              <option value="Night Shift">Night Shift</option>
              <option value="Morning Shift">Morning Shift</option>
            </select>
          </div>

          {/* Skip Weekends */}
          <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "14px", color: "#374151" }}>
            <input
              type="checkbox"
              name="skipWeekends"
              checked={form.skipWeekends}
              onChange={handleChange}
            />
            Skip weekends (Saturday & Sunday)
          </label>

          {/* Reason */}
          <div>
            <label style={labelStyle}>Reason / Note</label>
            <input
              type="text"
              name="reason"
              value={form.reason}
              onChange={handleChange}
              placeholder="e.g. Public holiday, site visit..."
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "24px" }}>
          <button
            onClick={onClose}
            style={{
              padding: "9px 20px", borderRadius: "8px", border: "1px solid #d1d5db",
              background: "white", fontSize: "14px", cursor: "pointer", fontWeight: "500",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              padding: "9px 20px", borderRadius: "8px", border: "none",
              background: saving ? "#93c5fd" : "#2563eb", color: "white",
              fontSize: "14px", cursor: saving ? "not-allowed" : "pointer", fontWeight: "600",
            }}
          >
            {saving ? "Saving..." : "Mark Attendance"}
          </button>
        </div>
      </div>
    </div>
  );
}
