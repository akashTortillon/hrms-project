import React, { useState, useEffect } from "react";
import SvgIcon from "../../components/svgIcon/svgView";
import { getAssetAlerts } from "../../services/assetService";
import "../../style/WarrantyAmcTrackerCard.css";

export default function AssetAlertsCard() {
  const [alerts, setAlerts] = useState({
    warrantyAlerts: [],
    serviceAlerts: [],
    amcAlerts: [],
    totalAlerts: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("warranty");

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const response = await getAssetAlerts();
      setAlerts(response);
    } catch (error) {
      console.error("Failed to fetch alerts", error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysLeft = (date) => {
    const today = new Date();
    const targetDate = new Date(date);
    const diffTime = targetDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getAlertColor = (daysLeft) => {
    if (daysLeft < 0) return "#dc2626";
    if (daysLeft <= 7) return "#dc2626";
    if (daysLeft <= 30) return "#f59e0b";
    return "#16a34a";
  };

  const renderAlertItem = (asset, date, type) => {
    const daysLeft = getDaysLeft(date);
    const color = getAlertColor(daysLeft);

    return (
      <div 
        key={asset._id} 
        className="warranty-item"
        style={{ borderLeft: `3px solid ${color}` }}
      >
        <div className="warranty-left">
          <div className="warranty-icon">
            <SvgIcon name="cube" size={20} />
          </div>
          <div className="warranty-info">
            <div className="warranty-name">{asset.name}</div>
            <div className="warranty-code">
              {asset.assetCode} • {asset.custodian?.name || "Unassigned"}
            </div>
          </div>
        </div>

        <div className="warranty-right">
          <div style={{ 
            padding: "4px 12px", 
            borderRadius: "12px",
            background: `${color}20`,
            color: color,
            fontSize: "12px",
            fontWeight: "500",
            marginBottom: "4px"
          }}>
            {daysLeft < 0 
              ? "Expired" 
              : daysLeft === 0 
              ? "Today" 
              : `${daysLeft} days`
            }
          </div>
          <div className="warranty-expiry">
            {new Date(date).toLocaleDateString()}
          </div>
        </div>
      </div>
    );
  };

  const tabs = [
    { id: "warranty", label: "Warranty", count: alerts.warrantyAlerts.length },
    { id: "service", label: "Service Due", count: alerts.serviceAlerts.length },
    { id: "amc", label: "AMC", count: alerts.amcAlerts.length }
  ];

  return (
    <div className="warranty-card">
      {/* Header */}
      <div className="warranty-card-header">
        <div>
          <h3 className="warranty-title">
            Asset Alerts
            {alerts.totalAlerts > 0 && (
              <span style={{
                marginLeft: "12px",
                padding: "4px 12px",
                borderRadius: "12px",
                background: "#fee2e2",
                color: "#dc2626",
                fontSize: "12px",
                fontWeight: "600"
              }}>
                {alerts.totalAlerts} alerts
              </span>
            )}
          </h3>
          <p className="warranty-subtitle">
            Upcoming expiries and service due dates
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ 
        display: "flex", 
        gap: "8px", 
        padding: "0 20px",
        borderBottom: "1px solid #e2e8f0",
        marginBottom: "16px"
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "12px 16px",
              border: "none",
              background: "none",
              cursor: "pointer",
              fontWeight: activeTab === tab.id ? "600" : "400",
              fontSize: "13px",
              color: activeTab === tab.id ? "#3b82f6" : "#64748b",
              borderBottom: activeTab === tab.id ? "2px solid #3b82f6" : "none",
              transition: "all 0.2s",
              position: "relative"
            }}
          >
            {tab.label}
            {tab.count > 0 && (
              <span style={{
                marginLeft: "6px",
                padding: "2px 6px",
                borderRadius: "10px",
                background: activeTab === tab.id ? "#dbeafe" : "#f1f5f9",
                color: activeTab === tab.id ? "#3b82f6" : "#64748b",
                fontSize: "11px",
                fontWeight: "600"
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Alert List */}
      <div className="warranty-list">
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
            Loading alerts...
          </div>
        ) : (
          <>
            {/* Warranty Alerts */}
            {activeTab === "warranty" && (
              <>
                {alerts.warrantyAlerts.length === 0 ? (
                  <div className="warranty-empty">
                    <div className="warranty-empty-icon">
                      <SvgIcon name="circle-tick" size={16} color="#16a34a" />
                    </div>
                    <div className="warranty-empty-text">
                      <div>No warranty expiring soon</div>
                      <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                        All assets have valid warranties
                      </div>
                    </div>
                  </div>
                ) : (
                  alerts.warrantyAlerts.map(asset => 
                    renderAlertItem(asset, asset.warrantyExpiryDate, "warranty")
                  )
                )}
              </>
            )}

            {/* Service Alerts */}
            {activeTab === "service" && (
              <>
                {alerts.serviceAlerts.length === 0 ? (
                  <div className="warranty-empty">
                    <div className="warranty-empty-icon">
                      <SvgIcon name="circle-tick" size={32} color="#16a34a" />
                    </div>
                    <div className="warranty-empty-text">
                      <div>No service due soon</div>
                      <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                        All scheduled services are up to date
                      </div>
                    </div>
                  </div>
                ) : (
                  alerts.serviceAlerts.map(asset => 
                    renderAlertItem(asset, asset.serviceDueDate, "service")
                  )
                )}
              </>
            )}

            {/* AMC Alerts */}
            {activeTab === "amc" && (
              <>
                {alerts.amcAlerts.length === 0 ? (
                  <div className="warranty-empty">
                    <div className="warranty-empty-icon">
                      <SvgIcon name="circle-tick" size={32} color="#16a34a" />
                    </div>
                    <div className="warranty-empty-text">
                      <div>No AMC expiring soon</div>
                      <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                        All AMC contracts are active
                      </div>
                    </div>
                  </div>
                ) : (
                  alerts.amcAlerts.map(asset => 
                    renderAlertItem(asset, asset.amcDetails.endDate, "amc")
                  )
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}