import React from "react";
import Card from "../../components/reusable/Card.jsx";
import SvgIcon from "../../components/svgIcon/svgView";
import PayrollSummaryCards from "./PayrollCards";
import PayrollStatus from "./PayrollStatus";
import PayrollEmployeesTable from "./PayrollTable";

export default function Payroll(){
    const payrollEmployeesData = [
  {
    id: 1,
    name: "Ahmed Al Mansoori",
    code: "EMP001",
    department: "Sales",
    basicSalary: "15,000",
    allowances: "3,000",
    deductions: "500",
    netSalary: "17,500",
  },
  {
    id: 1,
    name: "Ahmed Al Mansoori",
    code: "EMP001",
    department: "Sales",
    basicSalary: "15,000",
    allowances: "3,000",
    deductions: "500",
    netSalary: "17,500",
  },
  {
    id: 1,
    name: "Ahmed Al Mansoori",
    code: "EMP001",
    department: "Sales",
    basicSalary: "15,000",
    allowances: "3,000",
    deductions: "500",
    netSalary: "17,500",
  },
  {
    id: 1,
    name: "Ahmed Al Mansoori",
    code: "EMP001",
    department: "Sales",
    basicSalary: "15,000",
    allowances: "3,000",
    deductions: "500",
    netSalary: "17,500",
  },
];

    return (
        <div>
            <PayrollSummaryCards />
            <PayrollStatus />
            <PayrollEmployeesTable employees={payrollEmployeesData}/>
            <div className="wps-section">
      <h5 className="wps-title"><SvgIcon name="document" size={20}/> WPS Compliance Tools</h5>


      <div className="wps-card-grid">
        <Card
          title="Generate SIF File"
          subtitle="Create salary payment file for banks"
          className="wps-card"
        />

        <Card
          title="MOL Report"
          subtitle="Ministry of Labour compliance report"
          className="wps-card"
        />

        <Card
          title="Payment History"
          subtitle="View past payroll transactions"
          className="wps-card"
        />
      </div>
    </div>
        </div>
    );
}