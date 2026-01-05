import { useState } from "react";
import SvgIcon from "../../components/svgIcon/svgView";
import Card from "../../components/reusable/Card";
import Button from "../../components/reusable/Button";
import ScheduledReports from "./ScheduledReports";

import "../../style/Reports.css";

const TABS = ["All", "HR", "Payroll", "Assets", "Documents", "Compliance"];

const REPORTS = [
  {
    id: 1,
    title: "Departmental Attendance Report",
    description: "Department-wise attendance summary and trends",
    last: "2025-11-29",
    frequency: "Daily",
    tag: "HR",
    icon: "calendar",
  },
  {
    id: 2,
    title: "Employee Turnover Analysis",
    description: "Hiring, retention, and turnover metrics",
    last: "2025-11-20",
    frequency: "Monthly",
    tag: "HR",
    icon: "user",
  },
  {
    id: 3,
    title: "Leave Balance Report",
    description: "Employee leave balances and utilization",
    last: "2025-11-29",
    frequency: "Weekly",
    tag: "HR",
    icon: "calendar",
  },
];

export default function PrebuiltReports() {
  const [activeTab, setActiveTab] = useState("HR");

  const filteredReports =
    activeTab === "All"
      ? REPORTS
      : REPORTS.filter((r) => r.tag === activeTab);

  return (
    <div className="prebuilt-reports">

      {/* Tabs */}
      <div className="report-tabs">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`report-tab ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="reports-grid">
        {filteredReports.map((report) => (
          <Card key={report.id} className="report-card">
            <div className="report-card-header">
              <div className="report-icon"><SvgIcon name={report.icon} size={22} />
              </div>
              <span className="report-tag">{report.tag}</span>
            </div>

            <h4 className="report-title">{report.title}</h4>
            <p className="report-desc">{report.description}</p>

            <div className="report-meta">
              <span>Last: {report.last}</span>
              <span>{report.frequency}</span>
            </div>

            <div className="report-actions">
              <Button className="generate-btn">Generate</Button>
              <button className="download-btn">
                <SvgIcon name="download" size={22} />
              </button>
            </div>
          </Card>
        ))}
      </div>

        {/* Scheduled Reports Section */}   
        <ScheduledReports />
    </div>
  );
}
