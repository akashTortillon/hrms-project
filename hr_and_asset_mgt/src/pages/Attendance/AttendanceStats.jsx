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
// import { getAttendanceStats } from "../../services/attendanceService";
import "../../style/Attendance.css";

export default function AttendanceStats({ stats }) {
  if (!stats) return null;

  const config = [
    {
      title: "Present",
      value: stats.present,
      subtext: `${stats.total ? Math.round((stats.present / stats.total) * 100) : 0}%`,
      iconName: "circle-tick",
      colorVariant: "green",
    },
    {
      title: "Late",
      value: stats.late,
      subtext: `${stats.total ? Math.round((stats.late / stats.total) * 100) : 0}%`,
      iconName: "exclamation",
      colorVariant: "orange",
    },
    {
      title: "Absent",
      value: stats.absent,
      subtext: `${stats.total ? Math.round((stats.absent / stats.total) * 100) : 0}%`,
      iconName: "circle-xmark",
      colorVariant: "red",
    },
    {
      title: "On Leave",
      value: stats.leave,
      subtext: `${stats.total ? Math.round((stats.leave / stats.total) * 100) : 0}%`,
      iconName: "calendar",
      colorVariant: "yellow",
    },
    {
      title: "Total",
      value: stats.total,
      iconName: "clock (1)",
      colorVariant: "blue",
      subtext: "Employees",
    },
  ];

  return (
    <div className="attendance-stats">
      {config.map((stat) => (
        <StatCard
          key={stat.title}
          title={stat.title}
          value={stat.value}
          subtext={stat.subtext}
          iconName={stat.iconName}
          colorVariant={stat.colorVariant}
        />
      ))}
    </div>
  );
}
