import Card from "../../components/reusable/Card";
import Button from "../../components/reusable/Button";
import SvgIcon from "../../components/svgIcon/svgView";
import "../../style/Reports.css";

const RECENT_REPORTS = [
  {
    id: 1,
    title: "Sales Team Performance - Q4 2025",
    created: "2025-11-20",
    lastRun: "2025-11-28",
  },
  {
    id: 2,
    title: "Asset Allocation by Department",
    created: "2025-11-15",
    lastRun: "2025-11-25",
  },
];

export default function CustomReports() {
  return (
    <div className="custom-reports">

      {/* Builder Section */}
      <Card className="custom-builder-card">
        <div className="builder-content">
          <div className="builder-icon">
            <SvgIcon name="reports" size={28} />
          </div>

          <h3 className="builder-title">Custom Report Builder</h3>
          <p className="builder-desc">
            Create custom reports with drag-and-drop functionality.
            Select data fields, apply filters, and schedule automated delivery.
          </p>

          <Button className="builder-btn">Launch Report Builder</Button>
        </div>
      </Card>

      {/* Recent Reports */}
      <div className="recent-reports">
        <h4 className="recent-title">Recent Custom Reports</h4>

        <Card className="recent-reports-card">
          {RECENT_REPORTS.map((report) => (
            <div key={report.id} className="recent-report-item">
              <div>
                <div className="recent-report-name">{report.title}</div>
                <div className="recent-report-meta">
                  Created on {report.created} • Last run: {report.lastRun}
                </div>
              </div>

              <div className="recent-report-actions">
                <button className="action-link">Run</button>
                <button className="action-link">Edit</button>
                <button className="download-icon">
                  <SvgIcon name="download" size={18} />
                </button>
              </div>
            </div>
          ))}
        </Card>
      </div>

    </div>
  );
}
