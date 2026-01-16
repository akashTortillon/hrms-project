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
  markAttendance,
  syncBiometrics,
  getMonthlyAttendance
} from "../../services/attendanceService.js";
import { getDepartments, shiftService } from "../../services/masterService.js";
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

  // View State
  const [viewMode, setViewMode] = useState("day"); // 'day' or 'month'
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthlyRecords, setMonthlyRecords] = useState([]);
  const [stats, setStats] = useState({ present: 0, late: 0, absent: 0, leave: 0, total: 0 });

  // Filters State
  const [departments, setDepartments] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedShift, setSelectedShift] = useState("");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    if (viewMode === "day") {
      fetchAttendanceData();
    } else {
      fetchMonthlyData();
    }
  }, [selectedDate, viewMode, selectedMonth, selectedYear]);

  const fetchMasterData = async () => {
    try {
      const deps = await getDepartments();
      const shfs = await shiftService.getAll();
      setDepartments(deps);
      setShifts(shfs);
    } catch (error) {
      console.error("Failed to fetch filter options", error);
    }
  };

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

      // Calculate Stats
      const newStats = { present: 0, late: 0, absent: 0, leave: 0, total: formattedRecords.length };
      formattedRecords.forEach(r => {
        if (r.status === 'Present') newStats.present++;
        else if (r.status === 'Late') newStats.late++;
        else if (r.status === 'Absent') newStats.absent++;
        else if (r.status === 'On Leave') newStats.leave++;
      });
      setStats(newStats);

    } catch (error) {
      console.error("Failed to fetch attendance data", error);
      toast.error("Failed to load attendance records");
      setAttendanceRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyData = async () => {
    setLoading(true);
    try {
      const data = await getMonthlyAttendance(selectedMonth.toString(), selectedYear.toString());
      setMonthlyRecords(data);
    } catch (error) {
      console.error("Failed to fetch monthly data", error);
      toast.error("Failed to load monthly records");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setLoading(true);
      const res = await syncBiometrics();
      toast.success(`Synced ${res.synced} records successfully`);
      // Refresh current view
      if (viewMode === "day") fetchAttendanceData();
      else fetchMonthlyData();
    } catch (error) {
      console.error("Sync failed", error);
      toast.error("Sync failed");
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
      <AttendanceHeader
        viewMode={viewMode}
        setViewMode={setViewMode}
        onSync={handleSync}
        loading={loading}
      />
      <AttendanceStats stats={stats} />

      <AttendanceFilters
        viewMode={viewMode}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        departments={departments}
        shifts={shifts}
        selectedDepartment={selectedDepartment}
        setSelectedDepartment={setSelectedDepartment}
        selectedShift={selectedShift}
        setSelectedShift={setSelectedShift}
      />

      <AttendanceTable
        date={selectedDate}
        records={(viewMode === "day" ? attendanceRecords : monthlyRecords).filter(record => {
          const deptMatch = !selectedDepartment || record.department === selectedDepartment;
          const shiftMatch = !selectedShift || record.shift === selectedShift;
          return deptMatch && shiftMatch;
        })}
        viewMode={viewMode} // Pass view mode
        daysInMonth={viewMode === "month" ? new Date(selectedYear, selectedMonth, 0).getDate() : 0}
        onEdit={openAttendanceModal}
        loading={loading}
        year={selectedYear}
        month={selectedMonth}
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
