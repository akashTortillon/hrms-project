import SvgIcon from "../../components/svgIcon/svgView";
import Card from "../../components/reusable/Card";
import Button from "../../components/reusable/Button";
import "../../style/Reports.css";

const stats = [
  {
    title: "Reports Generated",
    value: "156",
    change: "+12%",
    icon: "reports",
  },
  {
    title: "Active Schedules",
    value: "8",
    change: "+2",
    icon: "calendar",
  },
  {
    title: "Custom Reports",
    value: "24",
    change: "+5",
    icon: "ocument",
  },
  {
    title: "Total Exports",
    value: "342",
    change: "+28%",
    icon: "download",
  },
];

export default function ReportsOverview() {
  return (
    <div className="reports-overview">
      {/* Header */}
      <div className="reports-header">
        <div>
          <h2 className="reports-title">Reports & Analytics</h2>
          <p className="reports-subtitle">
            Generate insights and export data reports
          </p>
        </div>

        <Button className="create-report-btn">
          + Create Custom Report
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="reports-stats-grid">
        {stats.map((item, index) => (
          <Card key={index} className="report-stat-card">
            <div className="stat-card-content">
              <div>
                <div className="stat-title">{item.title}</div>
                <div className="stat-value">
                  {item.value}
                  <span className="stat-change">{item.change}</span>
                </div>
              </div>

              <div className="stat-icon">
                <SvgIcon name={item.icon} size={22} />
                </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
