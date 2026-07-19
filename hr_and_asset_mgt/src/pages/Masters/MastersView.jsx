import { useSearchParams } from "react-router-dom";
import MastersTabs from "./MastersTabs";

import CompanyStructure from "./CompanyStructure/CompanyStructure";
import AssetManagement from "./AssetManagement/AssetManagement";
import HRManagement from "./HRManagement/HRManagement";
import SystemSettings from "./SystemSettings";

import "../../style/Masters.css";


export default function MastersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "company";

  const tabMeta = {
    company: {
      eyebrow: "Organization Setup",
      statLabel: "Active Workspace",
      statValue: "Company Structure"
    },
    hr: {
      eyebrow: "People Controls",
      statLabel: "Active Workspace",
      statValue: "HR Management"
    },
    asset: {
      eyebrow: "Asset Controls",
      statLabel: "Active Workspace",
      statValue: "Asset Management"
    },
    system: {
      eyebrow: "System Controls",
      statLabel: "Active Workspace",
      statValue: "System Settings"
    }
  };

  const currentMeta = tabMeta[activeTab] || tabMeta.company;

  const handleTabChange = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  const renderContent = () => {
    switch (activeTab) {
      case "company":
        return <CompanyStructure />;
      case "hr":
        return <HRManagement />;
      case "asset":
        return <AssetManagement />;
      case "system":
        return <SystemSettings />;
      default:
        return <CompanyStructure />;
    }
  };

  return (
    <div className="masters-page">
      <div className="masters-header">
        <div>
          <span className="masters-header-eyebrow">{currentMeta.eyebrow}</span>
          <h1 className="masters-title">Masters & Configuration</h1>
          <p className="masters-subtitle">
            Manage system masters and configuration settings
          </p>
        </div>

        <div className="masters-header-stat">
          <span className="masters-header-stat-label">{currentMeta.statLabel}</span>
          <strong className="masters-header-stat-value">{currentMeta.statValue}</strong>
        </div>
      </div>

      <div className="masters-content">
        <MastersTabs activeTab={activeTab} onChange={handleTabChange} />

        <div className="masters-tab-content">
          {renderContent()}
        </div>
      </div>

    </div>
  );
}
