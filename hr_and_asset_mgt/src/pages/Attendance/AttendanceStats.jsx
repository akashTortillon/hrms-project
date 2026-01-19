import StatCard from "../../components/reusable/StatCard";
import "../../style/Attendance.css";

export default function AttendanceStats({ stats }) {
  if (!stats) return null;

  const config = [
    {
      title: "Present",
      value: stats.present,
      percentage: `${stats.total ? Math.round((stats.present / stats.total) * 100) : 0}%`,
      icon: "circle-tick",
      iconColor: "#16a34a",
    },
    {
      title: "Late",
      value: stats.late,
      percentage: `${stats.total ? Math.round((stats.late / stats.total) * 100) : 0}%`,
      icon: "exclamation",
      iconColor: "#f97316",
    },
    {
      title: "Absent",
      value: stats.absent,
      percentage: `${stats.total ? Math.round((stats.absent / stats.total) * 100) : 0}%`,
      icon: "circle-xmark",
      iconColor: "#dc2626",
    },
    {
      title: "On Leave",
      value: stats.leave,
      percentage: `${stats.total ? Math.round((stats.leave / stats.total) * 100) : 0}%`,
      icon: "calendar",
      iconColor: "#f59e0b",
    },
    {
      title: "Total",
      value: stats.total,
      icon: "clock (1)",
      iconColor: "#2563eb",
      footerLabel: "Employees",
    },
  ];

  return (
    <div className="attendance-stats">
      {config.map((stat) => (
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
