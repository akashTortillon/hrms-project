

import React, { useEffect, useState } from "react";
import "../../style/AttendanceEditModal.css";
import { shiftService } from "../../services/masterService";

/* =========================
   Helpers
========================= */

const toMinutes = (time) => {
  if (!time || !time.includes(":")) return null;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
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
  const [shifts, setShifts] = useState([]);
  const [shift, setShift] = useState("Day Shift");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [status, setStatus] = useState("Absent");
  const [workHours, setWorkHours] = useState("0h 0m");

  const [onLeave] = useState(false);
  const [reason, setReason] = useState("");

  /* =========================
     Load employee
  ========================= */

  useEffect(() => {
    // Fetch Shifts
    const loadShifts = async () => {
      try {
        const data = await shiftService.getAll();
        setShifts(data);
      } catch (err) {
        console.error(err);
      }
    };
    loadShifts();

    if (!employee) return;

    setShift(employee.shift || "Day Shift");
    setCheckIn(employee.checkIn && employee.checkIn !== "-" ? employee.checkIn : "");
    setCheckOut(employee.checkOut && employee.checkOut !== "-" ? employee.checkOut : "");
  }, [employee]);

  /* =========================
     STATUS CALCULATION (FIXED)
  ========================= */

  useEffect(() => {
    if (onLeave) {
      setStatus("On Leave");
      return;
    }

    if (!checkIn && !checkOut) {
      setStatus("Absent");
      return;
    }

    const inMin = toMinutes(checkIn);
    if (inMin === null) {
      setStatus("Absent");
      return;
    }

    // ✅ DAY SHIFT
    if (shift === "Day Shift") {
      const dayLateMin = toMinutes("08:00");
      setStatus(inMin > dayLateMin ? "Late" : "Present");
      return;
    }

    // ✅ NIGHT SHIFT
    if (shift === "Night Shift") {
      const nightLateMin = toMinutes("08:00");
      setStatus(inMin > nightLateMin ? "Late" : "Present");
      return;
    }
  }, [checkIn, checkOut, shift, onLeave]);

  /* =========================
     WORK HOURS CALCULATION
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

    // Midnight rollover
    if (outMin < inMin) {
      outMin += 1440;
    }

    let diff = outMin - inMin;

    // ⛔ Subtract 12 hours (720 mins)
    diff -= 720;

    if (diff <= 0) {
      setWorkHours("0h 0m");
      return;
    }

    const h = Math.floor(diff / 60);
    const m = diff % 60;

    setWorkHours(`${h}h ${m}m`);
  }, [checkIn, checkOut]);

  /* ========================= */

  if (!isOpen || !employee) return null;



  const handleSave = () => {
    if (!reason || reason.trim() === "") {
      alert("Please provide a reason for this manual edit.");
      return;
    }

    onSave({
      _id: employee._id,
      employeeId: employee.employeeId,
      date,
      shift,
      checkIn: status === "Absent" ? null : checkIn,
      checkOut: status === "Absent" ? null : checkOut,
      status,
      workHours,
      reason // ✅ Pass reason
    });
  };

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
              <option value="">Select Shift</option>
              {shifts.map((s) => (
                <option key={s._id} value={s.name}>{s.name}</option>
              ))}
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

          <div className="full-width">
            <label>Reason for Edit <span style={{ color: 'red' }}>*</span></label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Required: Why are you editing this record?"
              rows={3}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            />
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
