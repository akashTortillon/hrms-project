import StatCard from "../../components/reusable/StatCard";
import "../../style/Payroll.css";
import SvgIcon from "../../components/svgIcon/svgView";

const pad2 = (n) => String(n).padStart(2, "0");
const toDateValue = (y, m, d) => `${y}-${pad2(m)}-${pad2(d)}`;
const lastDayOf = (y, m) => new Date(y, m, 0).getDate();

export default function PayrollSummaryCards({ stats, month, year, setMonth, setYear, latestFinalized, onExportWPS }) {
  const lockedKey = latestFinalized ? (latestFinalized.year * 100) + latestFinalized.month : null;
  const isMonthLocked = (m) => lockedKey !== null && ((year * 100) + m) <= lockedKey;
  // A year is fully locked only once every one of its months (up to December) is finalized-or-earlier.
  const isYearLocked = (y) => lockedKey !== null && ((y * 100) + 12) <= lockedKey;

  // From/To always mirror the selected month's full span — there's no separate
  // "day" state to track, so picking either end just re-derives month/year from
  // whichever date was picked (and the other end follows automatically on re-render).
  const fromDate = toDateValue(year, month, 1);
  const toDate = toDateValue(year, month, lastDayOf(year, month));

  const applyPickedDate = (value) => {
    if (!value) return;
    const [y, m] = value.split("-").map(Number);
    setYear(y);
    setMonth(m);
  };

  // Earliest selectable date: first day of the month right after the last
  // finalized period. Everything at or before that is locked.
  const minSelectableDate = latestFinalized
    ? (() => {
        const nextMonth = latestFinalized.month === 12 ? 1 : latestFinalized.month + 1;
        const nextYear = latestFinalized.month === 12 ? latestFinalized.year + 1 : latestFinalized.year;
        return toDateValue(nextYear, nextMonth, 1);
      })()
    : undefined;
  const cards = [
    {
      title: "Most recent payroll",
      amount: `₦${(stats?.totalNet || 0).toLocaleString()}`,
      trend: stats?.lastMonthComparison || "+2.4%",
      trendTerm: "vs last month",
      icon: "users",
      color: "#3b82f6"
    },
    {
      title: "Employee in payroll",
      amount: (stats?.empCount || 0).toString(),
      trend: "-2.4%", // Mock trends for UI completeness
      trendTerm: "vs last month",
      icon: "users",
      color: "#facc15"
    },
    {
      title: "Pending Salary Approvals",
      amount: (stats?.pendingApprovals || 0).toString(),
      trend: "This month's salary",
      icon: "clock (1)",
      color: "#f97316"
    },
    {
        title: "Total Deductions",
        amount: `₦${(stats?.totalDeductions || 0).toLocaleString()}`,
        trend: "For this month",
        icon: "dollar",
        color: "#f43f5e"
      },
  ];

  return (
    <>
      <div className="payroll-new-header">
        <div className="header-titles">
          <h2 className="payroll-main-title">Payroll Management</h2>
          <p className="payroll-main-subtitle">Manage all employee salaries, bonuses, deductions, and net pay.</p>
        </div>

        <div className="payroll-header-actions">
           <div className="period-selector">
              <div className="period-date-range">
                <input
                  type="date"
                  className="period-select period-date-input"
                  value={fromDate}
                  min={minSelectableDate}
                  max={toDate}
                  onChange={(e) => applyPickedDate(e.target.value)}
                  title="Payroll period start date"
                />
                <span className="period-date-range-sep">to</span>
                <input
                  type="date"
                  className="period-select period-date-input"
                  value={toDate}
                  min={fromDate}
                  max="2026-12-31"
                  onChange={(e) => applyPickedDate(e.target.value)}
                  title="Payroll period end date"
                />
              </div>
              <select className="period-select" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, i) => (
                  <option key={m} value={i + 1} disabled={isMonthLocked(i + 1)}>
                    {m}{isMonthLocked(i + 1) ? " (Finalized)" : ""}
                  </option>
                ))}
              </select>
              <select className="period-select" value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {[2024, 2025, 2026].map(y => (
                  <option key={y} value={y} disabled={isYearLocked(y)}>{y}</option>
                ))}
              </select>
           </div>
           <button className="export-record-btn" onClick={onExportWPS}>
              <SvgIcon name="download" size={14} />
              Export Record
            </button>
            
        </div>
      </div>

      

      <div className="payroll-stat-row">
        {cards.map((item, index) => (
          <div key={index} className="payroll-stat-card">
            <div className="card-left">
              <span className="card-title">{item.title}</span>
              <h3 className="card-amount">{item.amount}</h3>
              <div className={`card-trend ${item.trend.startsWith('+') ? 'positive' : item.trend.startsWith('-') ? 'negative' : ''}`}>
                <span className="trend-val">{item.trend}</span>
                <span className="trend-term">{item.trendTerm}</span>
              </div>
            </div>
            <div className="card-right" style={{ backgroundColor: `${item.color}15` }}>
              <SvgIcon name={item.icon} size={20} color={item.color} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

