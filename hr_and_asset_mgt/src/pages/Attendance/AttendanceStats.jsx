// import StatCard from "../../components/reusable/StatCard";
// import "../../style/Attendance.css";

// const attendanceStatsConfig = [
//   {
//     title: "Present",
//     value: "2",
//     percentage: "40%",
//     icon: "circle-tick",
//     iconColor: "#16a34a",
//   },
//   {
//     title: "Late",
//     value: "1",
//     percentage: "20%",
//     icon: "exclamation",
//     iconColor: "#f97316",
//   },
//   {
//     title: "Absent",
//     value: "1",
//     percentage: "20%",
//     icon: "circle-xmark",
//     iconColor: "#dc2626",
//   },
//   {
//     title: "On Leave",
//     value: "1",
//     percentage: "20%",
//     icon: "calendar",
//     iconColor: "#f59e0b",
//   },
//   {
//     title: "Total",
//     value: "5",
//     icon: "clock (1)",
//     iconColor: "#2563eb",
//     footerLabel: "Employees",
//   },
// ];

// export default function AttendanceStats() {
//   return (
//     <div className="attendance-stats">
//       {attendanceStatsConfig.map((stat) => (
//         <StatCard
//           key={stat.title}
//           title={stat.title}
//           value={stat.value}
//           percentage={stat.percentage}
//           icon={stat.icon}
//           iconColor={stat.iconColor}
//           footerLabel={stat.footerLabel}
//         />
//       ))}
//     </div>
//   );
// }


import { useEffect, useState } from "react";
import StatCard from "../../components/reusable/StatCard";
import { getAttendanceStats } from "../../services/attendanceService";
import "../../style/Attendance.css";

export default function AttendanceStats({ selectedDate }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!selectedDate) return;

    const fetchStats = async () => {
      try {
        const data = await getAttendanceStats(selectedDate);
        setStats(data);
      } catch (error) {
        console.error("Failed to fetch attendance stats", error);
      }
    };

    fetchStats();
  }, [selectedDate]);

  const percent = (value) =>
    stats?.total ? Math.round((value / stats.total) * 100) + "%" : "0%";

  if (!stats) return null;

  const attendanceStatsConfig = [
    {
      title: "Present",
      value: stats.present,
      percentage: percent(stats.present),
      icon: "circle-tick",
      iconColor: "#16a34a",
    },
    {
      title: "Late",
      value: stats.late,
      percentage: percent(stats.late),
      icon: "exclamation",
      iconColor: "#f97316",
    },
    {
      title: "Absent",
      value: stats.absent,
      percentage: percent(stats.absent),
      icon: "circle-xmark",
      iconColor: "#dc2626",
    },
    {
      title: "On Leave",
      value: stats.onLeave,
      percentage: percent(stats.onLeave),
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
