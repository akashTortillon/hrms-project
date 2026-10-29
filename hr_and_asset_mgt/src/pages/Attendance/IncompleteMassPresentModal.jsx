import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { getIncompleteAttendance, massCompleteAttendance } from "../../services/attendanceService.js";
import { getUaeToday } from "./attendanceDateUtils.js";

/**
 * Lists employees with Incomplete attendance for a day (check-in recorded, no check-out)
 * and marks the selected ones Present with the check-out set to the end of their own
 * shift (e.g. a 09:00-17:00 shift gets 17:00).
 */
export default function IncompleteMassPresentModal({ isOpen, onClose, onSuccess, initialDate }) {
  const [date, setDate] = useState(initialDate || getUaeToday());
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) setDate(initialDate || getUaeToday());
  }, [isOpen, initialDate]);

  useEffect(() => {
    if (!isOpen || !date) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await getIncompleteAttendance(date);
        if (cancelled) return;
        setRows(res.data || []);
        setSelected(new Set());
      } catch (err) {
        if (cancelled) return;
        toast.error(err.response?.data?.message || "Failed to load incomplete attendance");
        setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [isOpen, date]);

  const selectableRows = useMemo(() => rows.filter((r) => r.canComplete), [rows]);
  const allSelected = selectableRows.length > 0 && selectableRows.every((r) => selected.has(r.employeeId));

  const toggleOne = (employeeId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(employeeId)) next.delete(employeeId);
      else next.add(employeeId);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(selectableRows.map((r) => r.employeeId)));
  };

  const handleSubmit = async () => {
    if (!selected.size) {
      toast.error("Select at least one employee");
      return;
    }
    try {
      setSaving(true);
      const res = await massCompleteAttendance({ date, employeeIds: [...selected] });
      if (res.updated > 0) toast.success(res.message);
      const failed = (res.results || []).filter((r) => !r.success);
      failed.slice(0, 3).forEach((r) => toast.warning(`${r.name}: ${r.message}`));
      if (failed.length > 3) toast.warning(`${failed.length - 3} more employee(s) were skipped`);
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update attendance");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const cell = { padding: "10px 12px", fontSize: "13px", borderBottom: "1px solid #f3f4f6", textAlign: "left" };

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
        zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "white", borderRadius: "12px", padding: "28px", width: "100%",
          maxWidth: "820px", maxHeight: "88vh", display: "flex", flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#111827" }}>
            Incomplete Attendance — Mark Present
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#6b7280" }}>✕</button>
        </div>
        <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#6b7280" }}>
          Employees who checked in but never checked out. Marking them Present sets their check-out to the end of their shift.
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
          <label style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>Date</label>
          <input
            type="date"
            value={date}
            max={getUaeToday()}
            onChange={(e) => setDate(e.target.value)}
            style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "14px" }}
          />
          <span style={{ marginLeft: "auto", fontSize: "13px", color: "#6b7280" }}>
            {selected.size} selected of {rows.length}
          </span>
        </div>

        <div style={{ overflow: "auto", border: "1px solid #e5e7eb", borderRadius: "10px", flex: 1, minHeight: "120px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb", position: "sticky", top: 0 }}>
                <th style={{ ...cell, width: "40px" }}>
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} disabled={!selectableRows.length} aria-label="Select all" />
                </th>
                <th style={cell}>Employee</th>
                <th style={cell}>Shift</th>
                <th style={cell}>Check In</th>
                <th style={cell}>Check Out (will be)</th>
                <th style={cell}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ ...cell, textAlign: "center", padding: "24px" }}>Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} style={{ ...cell, textAlign: "center", padding: "24px", color: "#6b7280" }}>No incomplete attendance for this date.</td></tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.employeeId} style={{ opacity: row.canComplete ? 1 : 0.6 }}>
                    <td style={cell}>
                      <input
                        type="checkbox"
                        checked={selected.has(row.employeeId)}
                        disabled={!row.canComplete}
                        onChange={() => toggleOne(row.employeeId)}
                        aria-label={`Select ${row.name}`}
                      />
                    </td>
                    <td style={cell}>
                      <div style={{ fontWeight: 600, color: "#111827" }}>{row.name}</div>
                      <div style={{ fontSize: "12px", color: "#6b7280" }}>{row.code} • {row.department}</div>
                    </td>
                    <td style={cell}>{row.shift}</td>
                    <td style={cell}>{row.checkIn}</td>
                    <td style={cell}>
                      {row.canComplete
                        ? <strong>{row.shiftEnd}</strong>
                        : <span style={{ color: "#b45309", fontSize: "12px" }}>{row.reason}</span>}
                    </td>
                    <td style={cell}>{row.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "20px" }}>
          <button
            onClick={onClose}
            style={{ padding: "9px 20px", borderRadius: "8px", border: "1px solid #d1d5db", background: "white", fontSize: "14px", cursor: "pointer", fontWeight: "500" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !selected.size}
            style={{
              padding: "9px 20px", borderRadius: "8px", border: "none",
              background: saving || !selected.size ? "#93c5fd" : "#2563eb", color: "white",
              fontSize: "14px", cursor: saving || !selected.size ? "not-allowed" : "pointer", fontWeight: "600",
            }}
          >
            {saving ? "Updating..." : `Mark Present (${selected.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}
