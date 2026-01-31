import StatCard from "../../components/reusable/StatCard";
import "../../style/Assets.css";
import AppButton from "../../components/reusable/Button";
import SvgIcon from "../../components/svgIcon/svgView";

export default function AssetsHeader({ stats = [], onAddAsset, onImport }) {
  // const [importing, setImporting] = useState(false); // Removed internal state

  const handleImportClick = () => {
    if (onImport) onImport();
  };

  const getVariant = (color) => {
    if (color === '#2563eb') return 'blue';
    if (color === '#10b981') return 'green';
    if (color === '#f59e0b') return 'yellow';
    return 'gray';
  };

  return (
    <div className="document-library">
      {/* Header */}
      <div className="document-header">
        <div>
          <h2 className="document-title">Asset Register</h2>
          <p className="document-subtitle">
            Track and manage company assets and equipment
          </p>
        </div>

        <button
          className="asset-import-btn"
          onClick={handleImportClick}
        >
          <span>Import Assets</span>
        </button>

        <AppButton variant="primary" className="upload-btn" onClick={onAddAsset}>
          <SvgIcon name="plus" size={18} />
          <span>Add Asset</span>
        </AppButton>
      </div>

      {/* Stats */}
      <div className="document-stats">
        {stats.map((item, index) => (
          <StatCard
            key={index}
            title={item.title}
            value={item.value}
            iconName={item.icon}
            colorVariant={getVariant(item.iconColor)}
          />
        ))}
      </div>
    </div>
  );
}
