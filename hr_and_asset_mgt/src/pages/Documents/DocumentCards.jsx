
import Card from "../../components/reusable/Card";
import AppButton from "../../components/reusable/Button";
import SvgIcon from "../../components/svgIcon/svgView.jsx";
import "../../style/Document.css";


export default function DocumentLibraryHeader({ stats = { total: 0, valid: 0, expiring: 0, expired: 0 }, onUploadClick }) {

  // Use stats from props directly
  const { total, valid, expiring, expired, critical } = stats;

  const statItems = [
    {
      title: "Total Documents",
      value: total,
      icon: "document (1)",
      iconColor: "#2563eb",
    },
    {
      title: "Valid",
      value: valid,
      icon: "document (1)",
      iconColor: "#16a34a",
    },
    {
      title: "Expiring Soon",
      value: expiring,
      icon: "exclamation",
      iconColor: "#f59e0b",
    },
    {
      title: "Expired",
      value: expired,
      icon: "exclamation", // or reuse exclamation
      iconColor: "#991b1b",
    },
  ];

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

        <AppButton variant="primary" className="upload-btn" onClick={onUploadClick}>
          <SvgIcon name="upload" size={18} />
          <span>Upload Document</span>
        </AppButton>
      </div>

      {/* Stats */}
      <div className="document-stats">
        {statItems.map((item, index) => (
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
