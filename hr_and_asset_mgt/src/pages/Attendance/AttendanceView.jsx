// import React, { useState, useEffect } from "react";

// import AttendanceHeader from "./AttendanceHeader";
// import AttendanceStats from "./AttendanceStats";
// import AttendanceFilters from "./AttendanceFilters";
// import AttendanceTable from "./AttendanceTable";
// import ShiftManagement from "./AttendanceShift";

// import AttendanceEditModal from "./AttendanceEditModal";
// import { getDailyAttendance, updateAttendance, markAttendance } from "../../services/attendanceService.js";
// import { toast } from "react-toastify";

// // Utility → today's date
// const getTodayDate = () => {
//   const today = new Date();
//   return today.toISOString().split("T")[0];
// };

// // Helper function to map status to CSS class
// const getStatusClass = (status) => {
//   const statusMap = {
//     Present: "status-present",
//     Late: "status-late",
//     Absent: "status-absent",
//     "On Leave": "status-leave",
//   };
//   return statusMap[status] || "status-present";
// };

// function Attendance() {
//   const [selectedDate, setSelectedDate] = useState(getTodayDate());
//   const [attendanceRecords, setAttendanceRecords] = useState([]);
//   const [loading, setLoading] = useState(false);

//   // 🔹 Modal state
//   const [showModal, setShowModal] = useState(false);
//   const [selectedEmployee, setSelectedEmployee] = useState(null);

//   // 🔹 Fetch attendance data when date changes
//   useEffect(() => {
//     fetchAttendanceData();
//   }, [selectedDate]);

//   const fetchAttendanceData = async () => {
//     setLoading(true);
//     try {
//       const data = await getDailyAttendance(selectedDate);
      
//       // Format data to match table structure
//       const formattedRecords = data.map((record) => ({
//         id: record._id || record.employeeId,
//         _id: record._id,
//         employeeId: record.employeeId,
//         name: record.name,
//         code: record.code,
//         department: record.department,
//         shift: record.shift || "Day Shift",
//         checkIn: record.checkIn,
//         checkOut: record.checkOut,
//         workHours: record.workHours,
//         status: record.status || "Present",
//         statusClass: getStatusClass(record.status || "Present"),
//         icon: "user", // Default icon
//         iconColor: "#6b7280", // Default gray color
//       }));

//       setAttendanceRecords(formattedRecords);
//     } catch (error) {
//       console.error("Failed to fetch attendance data", error);
//       toast.error("Failed to load attendance records");
//       setAttendanceRecords([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // 🔹 Open modal from table
//   const openAttendanceModal = (employee) => {
//     setSelectedEmployee(employee);
//     setShowModal(true);
//   };

//   // 🔹 Save attendance
//   const handleSaveAttendance = async (data) => {
//     try {
//       const { _id, employeeId, date, checkIn, checkOut, status, shift } = data;
      
//       // If attendance record exists, update it; otherwise create new one
//       if (_id) {
//         await updateAttendance(_id, { checkIn, checkOut, shift });
//       } else {
//         await markAttendance({ employeeId, date, checkIn, checkOut, shift });
//       }
      
//       // Refresh attendance list after save
//       await fetchAttendanceData();
//       setShowModal(false);
//       setSelectedEmployee(null);
//       toast.success("Attendance saved successfully");
//     } catch (error) {
//       console.error("Failed to save attendance", error);
//       const errorMessage = error.response?.data?.message || "Failed to save attendance";
//       toast.error(errorMessage);
//     }
//   };

//   return (
//     <div>
//       <AttendanceHeader />

//       <AttendanceStats />

//       <AttendanceFilters
//         selectedDate={selectedDate}
//         onDateChange={setSelectedDate}
//       />

//       {/* Attendance Table */}
//       <AttendanceTable
//         date={selectedDate}
//         records={attendanceRecords}
//         onEdit={openAttendanceModal}
//         loading={loading}
//       />

//       <ShiftManagement />

//       {/* Attendance Edit Modal */}
//       <AttendanceEditModal
//         isOpen={showModal}
//         employee={selectedEmployee}
//         date={selectedDate}
//         onClose={() => setShowModal(false)}
//         onSave={handleSaveAttendance}
//       />
//     </div>
//   );
// }

// export default Attendance;




import React, { useState, useEffect } from "react";

import AttendanceHeader from "./AttendanceHeader";
import AttendanceStats from "./AttendanceStats";
import AttendanceFilters from "./AttendanceFilters";
import AttendanceTable from "./AttendanceTable";
import ShiftManagement from "./AttendanceShift";

import AttendanceEditModal from "./AttendanceEditModal";
import {
  getDailyAttendance,
  updateAttendance,
  markAttendance
} from "../../services/attendanceService.js";
import { toast } from "react-toastify";

// Utility → today's date
const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split("T")[0];
};

// Helper function to map status to CSS class
const getStatusClass = (status) => {
  const statusMap = {
    Present: "status-present",
    Late: "status-late",
    Absent: "status-absent",
    "On Leave": "status-leave",
  };
  return statusMap[status] || "status-present";
};

function Attendance() {
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  useEffect(() => {
    fetchAttendanceData();
  }, [selectedDate]);

  const fetchAttendanceData = async () => {
    setLoading(true);
    try {
      const data = await getDailyAttendance(selectedDate);

      const formattedRecords = data.map((record) => ({
        id: record._id || record.employeeId,
        _id: record._id,
        employeeId: record.employeeId,
        name: record.name,
        code: record.code,
        department: record.department,
        shift: record.shift || "Day Shift",
        checkIn: record.checkIn,
        checkOut: record.checkOut,
        workHours: record.workHours, // ✅ NOW COMES FROM BACKEND
        status: record.status || "Present",
        statusClass: getStatusClass(record.status || "Present"),
        icon: "user",
        iconColor: "#6b7280",
      }));

      setAttendanceRecords(formattedRecords);
    } catch (error) {
      console.error("Failed to fetch attendance data", error);
      toast.error("Failed to load attendance records");
      setAttendanceRecords([]);
    } finally {
      setLoading(false);
    }
  };

  // Open modal
  const openAttendanceModal = (employee) => {
    setSelectedEmployee(employee);
    setShowModal(true);
  };

  // ✅ Save attendance (FINAL)
  const handleSaveAttendance = async (data) => {
    try {
      const {
        _id,
        employeeId,
        date,
        checkIn,
        checkOut,
        status,
        shift,
        workHours
      } = data;

      if (_id) {
        await updateAttendance(_id, {
          checkIn,
          checkOut,
          shift,
          status,
          workHours
        });
      } else {
        await markAttendance({
          employeeId,
          date,
          checkIn,
          checkOut,
          shift,
          status,
          workHours
        });
      }

      await fetchAttendanceData(); // ✅ Table auto-updates
      setShowModal(false);
      setSelectedEmployee(null);
      toast.success("Attendance saved successfully");
    } catch (error) {
      console.error("Failed to save attendance", error);
      toast.error(
        error.response?.data?.message || "Failed to save attendance"
      );
    }
  };

  return (
    <div>
      <AttendanceHeader />
      <AttendanceStats />

      <AttendanceFilters
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
      />

      <AttendanceTable
        date={selectedDate}
        records={attendanceRecords}
        onEdit={openAttendanceModal}
        loading={loading}
      />

      <ShiftManagement />

      <AttendanceEditModal
        isOpen={showModal}
        employee={selectedEmployee}
        date={selectedDate}
        onClose={() => setShowModal(false)}
        onSave={handleSaveAttendance}
      />
    </div>
  );
}

export default Attendance;
