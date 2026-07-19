import StatCard from "../../components/reusable/StatCard";
import "../../style/Payroll.css";
import SvgIcon from "../../components/svgIcon/svgView";

export default function PayrollSummaryCards({ stats, periodStart, periodEnd, setPeriodEnd, onExportWPS }) {
  // Rolling pay period, force-contiguous: "From" is always locked/auto-computed by
  // the parent (day after the last finalized period's end) — HR only picks "To".
  // Picking "To" is what defines the period; the actual attendance-day count
  // (29, 30, 31, whatever) just falls out of whatever range gets picked.
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
                  value={periodStart}
                  disabled
                  title="Period start — locked to the day after the last finalized period ended"
                />
                <span className="period-date-range-sep">to</span>
                <input
                  type="date"
                  className="period-select period-date-input"
                  value={periodEnd}
                  min={periodStart}
                  onChange={(e) => e.target.value && setPeriodEnd(e.target.value)}
                  title="Period end — pick the date this payroll cycle should close on"
                />
              </div>
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

