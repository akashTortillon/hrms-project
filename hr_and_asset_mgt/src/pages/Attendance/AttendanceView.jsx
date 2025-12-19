
import React,{useState} from "react";
import AttendanceHeader from "./AttendanceHeader";
import AttendanceStats from "./AttendanceStats";
import AttendanceFilters from "./AttendanceFilters";
import AttendanceTable from "./AttendanceTable";
import ShiftManagement from "./AttendanceShift";


const attendanceData = [
  {
    id: 1,
    name: "Ahmed Al Mansoori",
    code: "EMP001",
    department: "Sales",
    shift: "Day Shift",
    checkIn: "08:45",
    checkOut: "17:30",
    workHours: "8h 45m",
    status: "Present",
    statusClass: "status-present",
    icon: "circle-tick",
    iconColor: "#16a34a",
  },
  {
    id: 2,
    name: "Sarah Johnson",
    code: "EMP002",
    department: "HR",
    shift: "Day Shift",
    checkIn: "09:15",
    checkOut: "18:00",
    workHours: "8h 45m",
    status: "Late",
    statusClass: "status-late",
    icon: "exclamation",
    iconColor: "#f97316",
  },
  {
    id: 3,
    name: "Mohammed Hassan",
    code: "EMP003",
    department: "Operations",
    shift: "Day Shift",
    checkIn: "08:30",
    checkOut: "17:15",
    workHours: "8h 45m",
    status: "Present",
    statusClass: "status-present",
    icon: "circle-tick",
    iconColor: "#16a34a",
  },
  {
    id: 4,
    name: "Lisa Chen",
    code: "EMP004",
    department: "Finance",
    shift: "Day Shift",
    status: "On Leave",
    statusClass: "status-leave",
    icon: "calendar",
    iconColor: "#f59e0b",
  },
  {
    id: 5,
    name: "David Brown",
    code: "EMP005",
    department: "IT",
    shift: "Day Shift",
    status: "Absent",
    statusClass: "status-absent",
    icon: "circle-xmark",
    iconColor: "#dc2626",
  },
];

const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split("T")[0];
};

function Attendance() {

    const [selectedDate, setSelectedDate] = useState(getTodayDate());



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
        records={attendanceData}/>
        <ShiftManagement />
    </div>
    )
}

export default Attendance;

