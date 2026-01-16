


import React, { useState, useEffect } from "react";

import AttendanceHeader from "./AttendanceHeader";
import AttendanceStats from "./AttendanceStats";
import AttendanceFilters from "./AttendanceFilters";
import AttendanceTable from "./AttendanceTable";
import ShiftManagement from "./AttendanceShift";
import { getDepartments } from "../../services/masterService";

import AttendanceEditModal from "./AttendanceEditModal";
import {
  getDailyAttendance,
  updateAttendance,
  markAttendance,
  getAttendanceStats
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

  //
  const [departmentOptions, setDepartmentOptions] = useState([]);
const [selectedDepartment, setSelectedDepartment] = useState("All Departments");

  // Shift filter state
  const [shiftOptions, setShiftOptions] = useState(["All Shifts", "Day Shift", "Night Shift", "Flexible"]);
  const [selectedShift, setSelectedShift] = useState("All Shifts");

  //

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  useEffect(() => {
    fetchAttendanceData();
  }, [selectedDate, selectedDepartment, selectedShift]);

  useEffect(() => {
  const fetchDepartments = async () => {
    try {
      const data = await getDepartments();
      setDepartmentOptions([
        "All Departments",
        ...data.map((d) => d.name)
      ]);
    } catch (error) {
      console.error("Failed to load departments", error);
    }
  };

  fetchDepartments();
}, []);


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
        status: record.status || "Absent",
        statusClass: getStatusClass(record.status || "Absent"),
        icon: "user",
        iconColor: "#6b7280",
      }));

      // setAttendanceRecords(formattedRecords);
      let filteredRecords = formattedRecords;

      // Apply department filter
      if (selectedDepartment !== "All Departments") {
        filteredRecords = filteredRecords.filter(
          (r) => r.department === selectedDepartment
        );
      }

      // Apply shift filter
      if (selectedShift !== "All Shifts") {
        filteredRecords = filteredRecords.filter(
          (r) => r.shift === selectedShift
        );
      }

setAttendanceRecords(filteredRecords);

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
      <AttendanceStats selectedDate={selectedDate} />

      {/* <AttendanceFilters
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
      /> */}

      <AttendanceFilters
  selectedDate={selectedDate}
  onDateChange={setSelectedDate}
  department={selectedDepartment}
  onDepartmentChange={setSelectedDepartment}
  departmentOptions={departmentOptions}
  shift={selectedShift}
  onShiftChange={setSelectedShift}
  shiftOptions={shiftOptions}
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
