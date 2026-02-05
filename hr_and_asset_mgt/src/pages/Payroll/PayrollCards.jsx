import StatCard from "../../components/reusable/StatCard";
import "../../style/Payroll.css";
import SvgIcon from "../../components/svgIcon/svgView";
import CustomSelect from "../../components/reusable/CustomSelect";


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
          {/* Month Selector */}
          <div style={{ width: '100%', maxWidth: '200px' }}>
            <CustomSelect
              className="payroll-month-select"
              value={month}
              onChange={(val) => setMonth(Number(val))}
              options={months.map((m, idx) => ({ value: idx + 1, label: m }))}
              placeholder="Select Month"
            />
          </div>

          {/* Year Selector */}
          <div style={{ width: '100%', maxWidth: '120px', marginLeft: '10px' }}>
            <CustomSelect
              className="payroll-month-select"
              value={year}
              onChange={(val) => setYear(Number(val))}
              options={[2024, 2025, 2026].map(y => ({ value: y, label: String(y) }))}
              placeholder="Select Year"
            />
          </div>

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
