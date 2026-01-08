import React, { useEffect, useState } from "react";
import "../../style/AttendanceEditModal.css";

const SHIFT_RULES = {
  "Day Shift": {
    lateAfter: "09:00",
  },
  "Night Shift": {
    lateAfter: "21:00",
  }
};

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

  useEffect(() => {
    if (employee) {
      setShift(employee.shift || "Day Shift");
      setCheckIn(employee.checkIn || "");
      setCheckOut(employee.checkOut || "");
    }
  }, [employee]);

  /** 🧠 Auto calculate status */
  useEffect(() => {
    if (!checkIn) {
      setStatus("Absent");
      return;
    }

    const rule = SHIFT_RULES[shift];
    if (!rule) return;

    setStatus(checkIn <= rule.lateAfter ? "Present" : "Late");
  }, [checkIn, shift]);

  /** ⏱ Work hours */
  useEffect(() => {
    if (checkIn && checkOut) {
      const start = new Date(`1970-01-01T${checkIn}`);
      const end = new Date(`1970-01-01T${checkOut}`);

      let diff = (end - start) / 60000;
      if (diff < 0) diff += 1440; // night shift support

      const h = Math.floor(diff / 60);
      const m = diff % 60;
      setWorkHours(`${h}h ${m}m`);
    } else {
      setWorkHours("0h 0m");
    }
  }, [checkIn, checkOut]);

  if (!isOpen || !employee) return null;

  const handleSave = () => {
    onSave({
      _id: employee._id,
      employeeId: employee.employeeId,
      date,
      shift,
      checkIn: status === "Absent" ? null : checkIn,
      checkOut: status === "Absent" ? null : checkOut,
      status
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
              <option>Day Shift</option>
              <option>Night Shift</option>
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
