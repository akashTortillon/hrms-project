import React, { useEffect, useState } from "react";
import "../../style/AttendanceEditModal.css";

const AttendanceEditModal = ({
  isOpen,
  onClose,
  employee,
  date,
  onSave
}) => {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [status, setStatus] = useState("Present");
  const [workHours, setWorkHours] = useState("0h 0m");

  useEffect(() => {
    if (employee) {
      setCheckIn(employee.checkIn || "");
      setCheckOut(employee.checkOut || "");
      setStatus(employee.status || "Present");
    }
  }, [employee]);

  useEffect(() => {
    if (checkIn && checkOut) {
      const start = new Date(`1970-01-01T${checkIn}`);
      const end = new Date(`1970-01-01T${checkOut}`);
      const diff = (end - start) / 60000;

      if (diff > 0) {
        const h = Math.floor(diff / 60);
        const m = diff % 60;
        setWorkHours(`${h}h ${m}m`);
      }
    } else {
      setWorkHours("0h 0m");
    }
  }, [checkIn, checkOut]);

  if (!isOpen || !employee) return null;

  const handleSave = () => {
    onSave({
      _id: employee._id, // Attendance record ID (null if new)
      employeeId: employee.employeeId, // Employee ID
      date,
      checkIn,
      checkOut,
      status
    });
  };

  const disableTimeFields =
    status === "Absent" || status === "On Leave";

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
            <input value="Day Shift (09:00 – 18:00)" disabled />
          </div>

          <div>
            <label>Check-in Time</label>
            <input
              type="time"
              value={checkIn}
              disabled={disableTimeFields}
              onChange={(e) => setCheckIn(e.target.value)}
            />
          </div>

          <div>
            <label>Check-out Time</label>
            <input
              type="time"
              value={checkOut}
              disabled={disableTimeFields}
              onChange={(e) => setCheckOut(e.target.value)}
            />
          </div>

          <div>
            <label>Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option>Present</option>
              <option>Late</option>
              <option>Absent</option>
              <option>On Leave</option>
            </select>
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
