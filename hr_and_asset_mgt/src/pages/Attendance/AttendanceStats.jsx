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


import StatCard from "../../components/reusable/StatCard";
import "../../style/Attendance.css";

const pct = (part, whole) => `${whole ? Math.round((part / whole) * 100) : 0}%`;

/**
 * Daily view: one card per status for the selected date (clicking a card filters the
 * table to that status). Monthly view: totals of employee-days across the visible range;
 * "Incomplete" shows its share of attended days (Present + Late + Incomplete) so HR can
 * see at a glance how much of the period has missing check-outs.
 */
export default function AttendanceStats({ stats, viewMode = "day", monthlyStats = null, selectedStatus = "", onSelectStatus = null }) {
  if (!stats) return null;

  const toggle = (status) => (onSelectStatus ? () => onSelectStatus(selectedStatus === status ? "" : status) : undefined);

  let config;
  if (viewMode === "month" && monthlyStats) {
    const attended = monthlyStats.present + monthlyStats.late + monthlyStats.incomplete;
    config = [
      { title: "Present Days", value: monthlyStats.present, subtext: pct(monthlyStats.present, attended), iconName: "circle-tick", colorVariant: "green", status: "Present" },
      { title: "Late Days", value: monthlyStats.late, subtext: pct(monthlyStats.late, attended), iconName: "exclamation", colorVariant: "orange", status: "Late" },
      { title: "Absent Days", value: monthlyStats.absent, iconName: "circle-xmark", colorVariant: "red", status: "Absent" },
      { title: "Incomplete Days", value: monthlyStats.incomplete, subtext: `${pct(monthlyStats.incomplete, attended)} of attended`, iconName: "exclamation", colorVariant: "red", status: "Incomplete" },
      { title: "On Leave Days", value: monthlyStats.leave, iconName: "calendar", colorVariant: "orange", status: "On Leave" },
      { title: "Employees", value: monthlyStats.employees, iconName: "clock (1)", colorVariant: "blue", subtext: "In view" },
    ];
  } else {
    config = [
      { title: "Present", value: stats.present, subtext: pct(stats.present, stats.total), iconName: "circle-tick", colorVariant: "green", status: "Present" },
      { title: "Late", value: stats.late, subtext: pct(stats.late, stats.total), iconName: "exclamation", colorVariant: "orange", status: "Late" },
      { title: "Absent", value: stats.absent, subtext: pct(stats.absent, stats.total), iconName: "circle-xmark", colorVariant: "red", status: "Absent" },
      { title: "Incomplete", value: stats.incomplete || 0, subtext: pct(stats.incomplete || 0, stats.total), iconName: "exclamation", colorVariant: "red", status: "Incomplete" },
      { title: "On Leave", value: stats.leave, subtext: pct(stats.leave, stats.total), iconName: "calendar", colorVariant: "orange", status: "On Leave" },
      { title: "Total", value: stats.total, iconName: "clock (1)", colorVariant: "blue", subtext: "Employees" },
    ];
  }

  return (
    <div className="attendance-stats">
      {config.map((stat) => (
        <div
          key={stat.title}
          style={selectedStatus && stat.status === selectedStatus ? { outline: "2px solid #1c4f9e", outlineOffset: "2px", borderRadius: "16px" } : undefined}
        >
          <StatCard
            title={stat.title}
            value={stat.value}
            subtext={stat.subtext}
            iconName={stat.iconName}
            colorVariant={stat.colorVariant}
            onClick={stat.status ? toggle(stat.status) : undefined}
          />
        </div>
      ))}
    </div>
  );
}
