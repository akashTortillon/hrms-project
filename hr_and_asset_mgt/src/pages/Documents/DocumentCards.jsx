
import Card from "../../components/reusable/Card";
import AppButton from "../../components/reusable/Button";
import SvgIcon from "../../components/svgIcon/svgView.jsx";
import "../../style/DocumentLibrary.css";

const stats = [
  {
    title: "Total Documents",
    value: 6,
    icon: "file",
    iconColor: "#2563eb",
  },
  {
    title: "Valid",
    value: 3,
    icon: "file-check",
    iconColor: "#16a34a",
  },
  {
    title: "Expiring Soon",
    value: 3,
    icon: "alert-circle",
    iconColor: "#f59e0b",
  },
  {
    title: "Expired",
    value: 0,
    icon: "alert-circle",
    iconColor: "#dc2626",
  },
];

export default function DocumentLibraryHeader() {
  return (
    <div className="document-library">
      {/* Header */}
      <div className="document-header">
        <div>
          <h2 className="document-title">Document Library</h2>
          <p className="document-subtitle">
            Manage company documents and track expiry dates
          </p>
        </div>

        <AppButton variant="primary" className="upload-btn">
          <SvgIcon name="upload" size={18} />
          <span>Upload Document</span>
        </AppButton>
      </div>

      {/* Stats */}
      <div className="document-stats">
        {stats.map((item, index) => (
          <Card key={index} className="document-stat-card">
            <div className="document-stat-content">
              <div className="document-stat-top">
                <span className="stat-title">{item.title}</span>
                <SvgIcon
                  name={item.icon}
                  size={20}
                  color={item.iconColor}
                />
              </div>

              <div className="stat-value">{item.value}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
