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

      {/* Page Header */}
      <div className="masters-header">
        <h1 className="masters-title">Masters & Configuration</h1>
        <p className="masters-subtitle">
          Manage system masters and configuration settings
        </p>
      </div>

      {/* Content Container */}
      <div className="masters-content">
        {/* Tabs */}
        <MastersTabs activeTab={activeTab} onChange={handleTabChange} />

        <div className="masters-tab-content">
          {renderContent()}
        </div>
      </div>

    </div>
  );
}
