import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import Card from "../../components/reusable/Card";
import Button from "../../components/reusable/Button";
import SvgIcon from "../../components/svgIcon/svgView";
import "../../style/Reports.css";

export default function CustomReports() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const response = await axios.get("/api/reports/custom-configs");
      if (response.data.success) {
        setReports(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching custom reports:", error);
      toast.error("Failed to load custom reports");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (report) => {
    try {
      toast.info(`Downloading ${report.title}...`);
      const response = await axios.post("/api/reports/custom", {
        dataset: report.dataset,
        columns: report.columns,
        filters: report.filters || {},
        export: true
      }, { responseType: 'blob' });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${report.title.replace(/\s+/g, '_')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error("Download failed");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this report configuration?")) return;
    try {
      const response = await axios.delete(`/api/reports/custom-configs/${id}`);
      if (response.data.success) {
        setReports(reports.filter(r => r._id !== id));
        toast.success("Report deleted");
      }
    } catch (err) {
      toast.error("Failed to delete report");
    }
  };

  const handleRun = (id) => {
    // Logic: Navigate to builder with preview mode or just load it
    navigate(`/app/reports/builder?id=${id}&run=true`);
  };

  if (loading) return <div className="p-4 text-center">Loading Custom Reports...</div>;

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
            Create custom reports by selecting datasets and columns.
            Save your configurations for quick access and downloads later.
          </p>

          <Button className="builder-btn" onClick={() => navigate("/app/reports/builder")}>Launch Report Builder</Button>
        </div>
      </Card>

      {/* Recent Reports */}
      <div className="recent-reports">
        <h4 className="recent-title">Recent Custom Reports</h4>

        <Card className="recent-reports-card">
          {reports.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No custom reports saved yet.</div>
          ) : (
            reports.map((report) => (
              <div key={report._id} className="recent-report-item">
                <div>
                  <div className="recent-report-name">{report.title}</div>
                  <div className="recent-report-meta">
                    Created: {new Date(report.createdAt).toLocaleDateString()} • Last run: {new Date(report.lastRun || report.updatedAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="recent-report-actions">
                  <button className="action-link" onClick={() => handleRun(report._id)}>Run</button>
                  <button className="action-link" onClick={() => navigate(`/app/reports/builder?id=${report._id}`)}>Edit</button>
                  <button className="download-icon" onClick={() => handleDownload(report)}>
                    <SvgIcon name="download" size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(report._id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff4d4d', marginLeft: '5px' }}
                  >
                    <SvgIcon name="delete" size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </Card>
      </div>

    </div>
  );
}
