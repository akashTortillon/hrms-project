import React, { useEffect, useState } from "react";
import "../../style/AttendanceEditModal.css";

// const SHIFT_RULES = {
//   "Day Shift": {
//     lateAfter: "08:00",
//   },
//   "Night Shift": {
//     lateAfter: "20:00",
//   }
// };

const toMinutes = (time) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const normalizeMinutes = (time, shiftStart) => {
  let mins = toMinutes(time);
  if (shiftStart >= 720 && mins < shiftStart) {
    mins += 1440; // night shift rollover
  }
  return mins;
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

  const rule = SHIFT_CONFIG[shift];
  if (!rule) return;

  const checkInMin = toMinutes(checkIn);
  const lateMin = toMinutes(rule.lateAfter);

  setStatus(checkInMin <= lateMin ? "Present" : "Late");
}, [checkIn, shift]);




  /** ⏱ Work hours */

  useEffect(() => {
  if (!checkIn || !checkOut) {
    setWorkHours("0h 0m");
    return;
  }

  const rule = SHIFT_CONFIG[shift];
  if (!rule) return;

  let shiftStart = toMinutes(rule.start);
  let shiftEnd = toMinutes(rule.end);

  let inMin = normalizeMinutes(checkIn, shiftStart);
  let outMin = normalizeMinutes(checkOut, shiftStart);

  if (shiftEnd <= shiftStart) shiftEnd += 1440;

  const actualStart = Math.max(inMin, shiftStart);
  const actualEnd = Math.min(outMin, shiftEnd);

  const workMinutes = Math.max(actualEnd - actualStart, 0);

  const h = Math.floor(workMinutes / 60);
  const m = workMinutes % 60;

  setWorkHours(`${h}h ${m}m`);
}, [checkIn, checkOut, shift]);






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
              <option value="Day Shift">Day Shift | 08:00 AM - 05:00 PM</option>
              <option value="Night Shift">Night Shift | 08:00 PM - 05:00 AM</option>
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
