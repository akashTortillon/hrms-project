import React, { useEffect, useState } from "react";
import "../../style/AttendanceEditModal.css";

/* =========================
   Helpers
========================= */

const toMinutes = (time) => {
  if (!time || !time.includes(":")) return null;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const SHIFT_CONFIG = {
  "Day Shift": {
    start: "08:00",
    end: "17:00",
    lateAfter: "08:00"
  },
  "Night Shift": {
    start: "20:00",
    end: "05:00",
    lateAfter: "20:00"
  }
};

/* =========================
   Component
========================= */

const AttendanceEditModal = ({
  isOpen,
  onClose,
  employee,
  date,
  onSave
}) => {
  const [shift, setShift] = useState("Day Shift");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [status, setStatus] = useState("Present");
  const [workHours, setWorkHours] = useState("0h 0m");

  /* Load employee */
  useEffect(() => {
    if (!employee) return;
    setShift(employee.shift || "Day Shift");
    setCheckIn(employee.checkIn || "");
    setCheckOut(employee.checkOut || "");
    setWorkHours("0h 0m");
  }, [employee]);

  /* =========================
     Status Calculation
  ========================= */

  useEffect(() => {
    if (!checkIn) {
      setStatus("Absent");
      return;
    }

    const rule = SHIFT_CONFIG[shift];
    if (!rule) return;

    const inMin = toMinutes(checkIn);
    const lateMin = toMinutes(rule.lateAfter);

    if (inMin === null || lateMin === null) {
      setStatus("Absent");
      return;
    }

    setStatus(inMin <= lateMin ? "Present" : "Late");
  }, [checkIn, shift]);

  /* =========================
     ✅ WORK HOURS (FIXED)
  ========================= */

  useEffect(() => {
  if (!checkIn || !checkOut) {
    setWorkHours("0h 0m");
    return;
  }

  let inMin = toMinutes(checkIn);
  let outMin = toMinutes(checkOut);

  if (inMin === null || outMin === null) {
    setWorkHours("0h 0m");
    return;
  }

  // ❌ Invalid Day Shift data
  if (shift === "Day Shift" && outMin <= inMin) {
    setWorkHours("0h 0m");
    return;
  }

  // 🌙 Night shift crosses midnight
  if (shift === "Night Shift" && outMin < inMin) {
    outMin += 1440;
  }

  const diff = outMin - inMin;

  if (diff <= 0) {
    setWorkHours("0h 0m");
    return;
  }

  const h = Math.floor(diff / 60);
  const m = diff % 60;

  setWorkHours(`${h}h ${m}m`);
}, [checkIn, checkOut, shift]);

  return (
    <div className="attendance-modal-overlay">
      <div className="attendance-modal">
        <h2>Mark Attendance – {date}</h2>

        <div className="modal-grid">
          <div>
            <label>Employee Name</label>
            <input value={employee.name} disabled />
          </div>

          <div>
            <label>Employee ID</label>
            <input value={employee.code} disabled />
          </div>

          <div>
            <label>Department</label>
            <input value={employee.department} disabled />
          </div>

          <div>
            <label>Shift</label>
            <select value={shift} onChange={(e) => setShift(e.target.value)}>
              <option value="Day Shift">Day Shift | 08:00 - 17:00</option>
              <option value="Night Shift">Night Shift | 20:00 - 05:00</option>
            </select>
          </div>

          <div>
            <label>Check-in</label>
            <input
              type="time"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
            />
          </div>

          <div>
            <label>Check-out</label>
            <input
              type="time"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
            />
          </div>

          <div>
            <label>Status (Auto)</label>
            <input value={status} disabled />
          </div>

          <div>
            <label>Work Hours</label>
            <input value={workHours} disabled />
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-save" onClick={handleSave}>
            Save Attendance
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttendanceEditModal;
