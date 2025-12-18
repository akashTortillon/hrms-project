import StatCard from "../../components/reusable/StatCard";
import "../../style/Attendance.css";

const attendanceStatsConfig = [
  {
    title: "Present",
    value: "2",
    percentage: "40%",
    icon: "circle-tick",
    iconColor: "#16a34a",
  },
  {
    title: "Late",
    value: "1",
    percentage: "20%",
    icon: "exclamation",
    iconColor: "#f97316",
  },
  {
    title: "Absent",
    value: "1",
    percentage: "20%",
    icon: "xCircle",
    iconColor: "#dc2626",
  },
  {
    title: "On Leave",
    value: "1",
    percentage: "20%",
    icon: "calendar",
    iconColor: "#f59e0b",
  },
  {
    title: "Total",
    value: "5",
    icon: "clock",
    iconColor: "#2563eb",
    footerLabel: "Employees",
  },
];

export default function AttendanceStats() {
  return (
    <div className="attendance-stats">
      {attendanceStatsConfig.map((stat) => (
        <StatCard
          key={stat.title}
          title={stat.title}
          value={stat.value}
          percentage={stat.percentage}
          icon={stat.icon}
          iconColor={stat.iconColor}
          footerLabel={stat.footerLabel}
        />
      ))}
    </div>
  );
}
