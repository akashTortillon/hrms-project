import { useState } from "react";
import MastersTabs from "./MastersTabs";

import CompanyStructure from "./CompanyStructure/CompanyStructure";
import HRManagement from "./HRManagement/HRManagement";
import AssetManagement from "./AssetManagement";
import SystemSettings from "./SystemSettings";

import "../../style/Masters.css";

export default function MastersPage() {
  const [activeTab, setActiveTab] = useState("company");

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
        return null;
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

      {/* Tabs */}
      <MastersTabs activeTab={activeTab} onChange={setActiveTab} />

      {/* Content Container */}
      <div className="masters-content">
        {renderContent()}
      </div>

    </div>
  );
}
