import StatCard from "../../components/reusable/StatCard";
import "../../style/Document.css";
import AppButton from "../../components/reusable/Button";
import SvgIcon from "../../components/svgIcon/svgView";


export default function DocumentLibraryHeader({ stats = { total: 0, valid: 0, expiring: 0, expired: 0 }, onUploadClick }) {

  // Use stats from props directly
  const { total, valid, expiring, expired, critical } = stats;

  const statItems = [
    {
      title: "Total Documents",
      value: total,
      icon: "document (1)",
      variant: "blue",
    },
    {
      title: "Valid",
      value: valid,
      icon: "document (1)",
      variant: "green",
    },
    {
      title: "Expiring Soon",
      value: expiring,
      icon: "exclamation",
      variant: "orange",
    },
    {
      title: "Expired",
      value: expired,
      icon: "exclamation",
      variant: "red",
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

        {onUploadClick && (
          <AppButton variant="primary" className="upload-btn" onClick={onUploadClick}>
            <SvgIcon name="upload" size={18} />
            <span>Upload Document</span>
          </AppButton>
        )}
      </div>

      {/* Stats */}
      <div className="document-stats">
        {statItems.map((item, index) => (
          <StatCard
            key={index}
            title={item.title}
            value={item.value}
            iconName={item.icon}
            colorVariant={item.variant}
          />
        ))}
      </div>
    </div>
  );
}
