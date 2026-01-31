import StatCard from "../../components/reusable/StatCard";
import "../../style/Payroll.css";
import SvgIcon from "../../components/svgIcon/svgView";


export default function PayrollSummaryCards({ stats, month, year, setMonth, setYear, onExportWPS }) {
  const cards = [
    {
      title: "Total Basic Salary",
      amount: `${(stats?.totalBasic || 0).toLocaleString()} AED`,
      variant: "blue",
    },
    {
      title: "Total Allowances",
      amount: `${(stats?.totalAllowances || 0).toLocaleString()} AED`,
      variant: "green",
    },
    {
      title: "Total Deductions",
      amount: `${(stats?.totalDeductions || 0).toLocaleString()} AED`,
      variant: "red",
    },
    {
      title: "Net Payable",
      amount: `${(stats?.totalNet || 0).toLocaleString()} AED`,
      variant: "blue", // purple maps to blue or we can use another variant if needed
    },
  ];

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <>
      <div className="payroll-header">
        <div>
          <h2 className="employees-title">Payroll Processing</h2>
          <p className="employees-subtitle">
            Manage monthly salary processing and WPS compliance
          </p>
        </div>

        <div className="payroll-header-actions">
          {/* Month Selector */}
          <select
            className="payroll-month-select"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {months.map((m, idx) => (
              <option key={idx} value={idx + 1}>{m}</option>
            ))}
          </select>

          {/* Year Selector */}
          <select
            className="payroll-month-select"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            style={{ marginLeft: '10px' }}
          >
            <option value={2024}>2024</option>
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
          </select>

          <button className="payroll-export-btn" onClick={onExportWPS}>
            <SvgIcon name="download" size={16} />
            Export WPS File
          </button>
        </div>
      </div>

      <div className="payroll-summary-grid">
        {cards.map((item, index) => (
          <StatCard
            key={index}
            title={item.title}
            value={item.amount}
            iconName="dollar"
            colorVariant={item.variant}
          />
        ))}
      </div>
    </>
  );
}
