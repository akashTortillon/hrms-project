
import Card from "../../components/reusable/Card.jsx";

import SvgIcon from "../../components/svgIcon/svgView";
import "../../style/Payroll.css";


export default function PayrollSummaryCards({ stats, month, year, setMonth, setYear, onExportWPS }) {
  const cards = [
    {
      title: "Total Basic Salary",
      amount: `${(stats?.totalBasic || 0).toLocaleString()} AED`,
      iconColor: "blue",
    },
    {
      title: "Total Allowances",
      amount: `${(stats?.totalAllowances || 0).toLocaleString()} AED`,
      iconColor: "green",
    },
    {
      title: "Total Deductions",
      amount: `${(stats?.totalDeductions || 0).toLocaleString()} AED`,
      iconColor: "red",
    },
    {
      title: "Net Payable",
      amount: `${(stats?.totalNet || 0).toLocaleString()} AED`,
      iconColor: "purple",
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

          <Card key={index} className="payroll-summary-card">
            <div className="payroll-summary-content">
              <div>
                <div className="payroll-summary-title">{item.title}</div>
                <div className="payroll-summary-amount">{item.amount}</div>
              </div>

              <SvgIcon
                name="dollar"
                size={22}
                className={`payroll-summary-icon ${item.iconColor}`}
              />
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
