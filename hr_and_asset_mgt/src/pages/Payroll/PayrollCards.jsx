import StatCard from "../../components/reusable/StatCard";
import "../../style/Payroll.css";
import SvgIcon from "../../components/svgIcon/svgView";



export default function PayrollSummaryCards({ stats, month, year, setMonth, setYear, onExportWPS }) {
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
              <select className="period-select" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
              <select className="period-select" value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {[2024, 2025, 2026].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
           </div>
           <button className="export-record-btn" onClick={onExportWPS}>
              <SvgIcon name="download" size={14} />
              Export Record
            </button>
            <button className="new-payroll-btn">
              <span className="plus-icon">+</span>
              New payroll
            </button>
        </div>
      </div>

      {/* Alert Bar */}
      <div className="payroll-alert-bar">
        <div className="alert-content">
            <span className="alert-icon">⚠️</span>
            <span className="alert-text">Payroll submission for the current pay period is due in 2 days. Review and finalize all employee payroll details</span>
        </div>
        <button className="alert-close">×</button>
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

