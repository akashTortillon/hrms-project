
import Card from "../../components/reusable/Card.jsx";

import SvgIcon from "../../components/svgIcon/svgView";
import "../../style/Payroll.css";


export default function PayrollSummaryCards() {
  const cards = [
    {
      title: "Total Basic Salary",
      amount: "59,000 AED",
      iconColor: "blue",
    },
    {
      title: "Total Allowances",
      amount: "11,500 AED",
      iconColor: "green",
    },
    {
      title: "Total Deductions",
      amount: "1,800 AED",
      iconColor: "red",
    },
    {
      title: "Net Payable",
      amount: "68,700 AED",
      iconColor: "purple",
    },
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
        <select className="payroll-month-select">
          <option>November 2025</option>
          <option>October 2025</option>
          <option>September 2025</option>
        </select>

        <button className="payroll-export-btn">
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
