
import SvgIcon from "../../components/svgIcon/svgView";

export default function MastersTabs({ activeTab, onChange }) {
  const tabs = [
    { id: "company", label: "Company Structure", icon: "building" },
    { id: "hr", label: "HR Management", icon: "users" },
    { id: "asset", label: "Asset Management", icon: "cube" },
    { id: "system", label: "System Settings", icon: "settings" },
  ];

  return (
    <div className="masters-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`masters-tab ${activeTab === tab.id ? "active" : ""}`}
          onClick={() => onChange(tab.id)}
        >
          <SvgIcon name={tab.icon} size={18} />
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
