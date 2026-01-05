import Card from "../../components/reusable/Card";
import "../../style/Reports.css";

const SCHEDULED_REPORTS = [
  {
    id: 1,
    title: "Daily Attendance Report",
    description: "Sent daily at 6:00 PM to HR Team",
    status: "Active",
  },
  {
    id: 2,
    title: "Monthly Payroll Summary",
    description: "Sent 1st of each month to Finance Department",
    status: "Active",
  },
  {
    id: 3,
    title: "Document Expiry Alerts",
    description: "Sent weekly on Monday to Admin Team",
    status: "Active",
  },
];

export default function ScheduledReports() {
  return (
    <Card className="scheduled-reports-card">

        <div className="scheduled-header">
    
            <div className="scheduled-header-text">
                <h3 className="scheduled-section-title">Scheduled Reports</h3>
            <p className="scheduled-section-subtitle">
                Automated report generation schedule
            </p>
            </div>
        
      
            <button className="manage-link">Manage Schedules</button>
        </div>

      <div className="scheduled-list">
        {SCHEDULED_REPORTS.map((item) => (
          <div key={item.id} className="scheduled-item">
            
            <div className="scheduled-info">
              <div className="scheduled-title">{item.title}</div>
              <div className="scheduled-desc">{item.description}</div>
            </div>

            <div className="scheduled-actions">
              <span className="status-pill">{item.status}</span>
              <button className="edit-link">Edit</button>
            </div>

          </div>
        ))}
      </div>
    </Card>
  );
}
