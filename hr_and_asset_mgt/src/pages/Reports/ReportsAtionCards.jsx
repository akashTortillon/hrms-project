import { useState, useEffect } from "react";
import api from "../../api/apiClient";
import SvgIcon from "../../components/svgIcon/svgView";
import Card from "../../components/reusable/Card";
import Button from "../../components/reusable/Button";
import StatCard from "../../components/reusable/StatCard"; // ✅ Integrated Card
import { useNavigate } from "react-router-dom";
import "../../style/Reports.css";

export default function ReportsOverview() {
  const navigate = useNavigate();
  const [stats, setStats] = useState([
    { title: "Reports Generated", value: "--", change: "+0", icon: "reports" },
    { title: "Active Schedules", value: "--", change: "+0", icon: "calendar" },
    { title: "Custom Reports", value: "--", change: "+0", icon: "document" },
    { title: "Total Exports", value: "--", change: "+0", icon: "download" },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get("/api/reports/stats");
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching report stats:", error);
    } finally {
      setLoading(false);
    }
  };

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

        <Button className="create-report-btn" onClick={() => navigate("/app/reports/builder")}>
          + Create Custom Report
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="reports-stats-grid">
        {stats.map((item, index) => {
          // Determine variant based on icon type for variety
          const getVariant = (icon) => {
            if (icon === 'reports') return 'blue';
            if (icon === 'calendar') return 'green';
            if (icon === 'document') return 'orange';
            return 'red';
          };

          return (
            <StatCard
              key={index}
              title={item.title}
              value={item.value}
              subtext={
                <span style={{ color: item.change.includes('+') ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 500 }}>
                  {item.change}
                </span>
              }
              iconName={item.icon === "document" ? "reports" : item.icon}
              colorVariant={getVariant(item.icon)}
            />
          );
        })}
      </div>
    </div>
  );
}
