import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

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
  getMonthlyAttendance,
  exportAttendanceReport
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
  const [searchParams, setSearchParams] = useSearchParams();

  // Read State from URL Params
  const viewMode = searchParams.get("view") || "day";
  const selectedDate = searchParams.get("date") || getTodayDate();
  const selectedMonth = parseInt(searchParams.get("month") || (new Date().getMonth() + 1));
  const selectedYear = parseInt(searchParams.get("year") || new Date().getFullYear());
  const selectedDepartment = searchParams.get("department") || "";
  const selectedShift = searchParams.get("shift") || "";

  // Data State
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [monthlyRecords, setMonthlyRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ present: 0, late: 0, absent: 0, leave: 0, total: 0 });

  // Filter Options State
  const [departments, setDepartments] = useState([]);
  const [shifts, setShifts] = useState([]);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Setters wrapper
  const updateParams = (updates) => {
    const newParams = new URLSearchParams(searchParams);

    // Merge updates
    Object.keys(updates).forEach(key => {
      if (updates[key]) {
        newParams.set(key, updates[key]);
      } else {
        newParams.delete(key);
      }
    });

    setSearchParams(newParams);
  };

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    if (viewMode === "day") {
      fetchAttendanceData();
    } else {
      fetchMonthlyData();
    }
  }, [searchParams]); // Re-fetch whenever ANY param changes

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
        workHours: record.workHours,
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
      if (viewMode === "day") fetchAttendanceData();
      else fetchMonthlyData();
    } catch (error) {
      console.error("Sync failed", error);
      toast.error("Sync failed");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const filters = {
        view: viewMode,
        date: selectedDate,
        month: selectedMonth,
        year: selectedYear,
        department: selectedDepartment,
        shift: selectedShift
      };

      const blob = await exportAttendanceReport(filters);

      // Trigger Download
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;

      const filename = viewMode === "month"
        ? `Attendance_${selectedMonth}-${selectedYear}.xlsx`
        : `Attendance_${selectedDate}.xlsx`;

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);

      toast.success("Report downloaded successfully");
    } catch (error) {
      console.error("Export failed", error);
      toast.error("Failed to export report");
    }
  };

  const openAttendanceModal = (employee) => {
    setSelectedEmployee(employee);
    setShowModal(true);
  };

  const handleSaveAttendance = async (data) => {
    try {
      const { _id, employeeId, date, checkIn, checkOut, status, shift, workHours } = data;

      if (_id) {
        await updateAttendance(_id, { checkIn, checkOut, shift, status, workHours });
      } else {
        await markAttendance({ employeeId, date, checkIn, checkOut, shift, status, workHours });
      }

      await fetchAttendanceData();
      setShowModal(false);
      setSelectedEmployee(null);
      toast.success("Attendance saved successfully");
    } catch (error) {
      console.error("Failed to save attendance", error);
      toast.error(error.response?.data?.message || "Failed to save attendance");
    }
  };

  return (
    <div>
      <AttendanceHeader
        viewMode={viewMode}
        setViewMode={(m) => updateParams({ view: m })}
        onSync={handleSync}
        loading={loading}
        onExport={handleExport}
      />
      <AttendanceStats stats={stats} />

      <AttendanceFilters
        viewMode={viewMode}
        selectedDate={selectedDate}
        onDateChange={(d) => updateParams({ date: d })}
        selectedMonth={selectedMonth}
        setSelectedMonth={(m) => updateParams({ month: m })}
        selectedYear={selectedYear}
        setSelectedYear={(y) => updateParams({ year: y })}
        departments={departments}
        shifts={shifts}
        selectedDepartment={selectedDepartment}
        setSelectedDepartment={(d) => updateParams({ department: d })}
        selectedShift={selectedShift}
        setSelectedShift={(s) => updateParams({ shift: s })}
      />

      <AttendanceTable
        date={selectedDate}
        records={(viewMode === "day" ? attendanceRecords : monthlyRecords).filter(record => {
          const deptMatch = !selectedDepartment || record.department === selectedDepartment;
          const shiftMatch = !selectedShift || record.shift === selectedShift;
          return deptMatch && shiftMatch;
        })}
        viewMode={viewMode}
        daysInMonth={viewMode === "month" ? new Date(selectedYear, selectedMonth, 0).getDate() : 0}
        onEdit={openAttendanceModal}
        loading={loading}
        year={selectedYear}
        month={selectedMonth}
      />

      {/* <ShiftManagement /> */}

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
