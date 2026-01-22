


import { useState } from "react";
import Card from "../../components/reusable/Card";
import AppButton from "../../components/reusable/Button";
import SvgIcon from "../../components/svgIcon/svgView.jsx";
import "../../style/Assets.css";

export default function AssetsHeader({ stats = [], onAddAsset, onImport }) {
  const [importing, setImporting] = useState(false);

  const handleImportClick = async () => {
    if (importing) return;
    setImporting(true);
    await onImport();
    setImporting(false);
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
          disabled={importing}
          style={{ opacity: importing ? 0.7 : 1, cursor: importing ? 'wait' : 'pointer' }}
        >
          <span>{importing ? "Importing..." : "Import Assets"}</span>
        </button>

        <AppButton variant="primary" className="upload-btn" onClick={onAddAsset}>
          <SvgIcon name="plus" size={18} />
          <span>Add Asset</span>
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
