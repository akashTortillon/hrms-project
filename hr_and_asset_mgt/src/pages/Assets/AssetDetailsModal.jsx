import React, { useState } from "react";
import SvgIcon from "../../components/svgIcon/svgView";
import "../../style/Assets.css";

export default function AssetDetailsModal({ onClose, asset }) {
  const [activeTab, setActiveTab] = useState("overview");

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  const formatCurrency = (amount) => {
    return `AED ${amount?.toLocaleString() || 0}`;
  };

  const getWarrantyStatus = () => {
    if (!asset.warrantyExpiryDate) return { status: "N/A", color: "#6b7280" };

    const today = new Date();
    const expiryDate = new Date(asset.warrantyExpiryDate);
    const daysLeft = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) return { status: "Expired", color: "#dc2626" };
    if (daysLeft <= 30) return { status: `${daysLeft} days left`, color: "#f59e0b" };
    return { status: "Active", color: "#16a34a" };
  };

  const warrantyStatus = getWarrantyStatus();

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "maintenance", label: "Maintenance" },
    { id: "documents", label: "Documents" },
    { id: "amc", label: "AMC" }
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container"
        style={{ maxWidth: "900px", width: "95%" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h3>{asset.name}</h3>
            <div style={{ fontSize: "14px", color: "#64748b", marginTop: "4px" }}>
              {asset.assetCode || asset.code} • {asset.category}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Tabs */}
          <div style={{
            display: "flex",
            gap: "8px",
            borderBottom: "1px solid #e2e8f0",
            marginBottom: "20px"
          }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "12px 24px",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  fontWeight: activeTab === tab.id ? "600" : "400",
                  color: activeTab === tab.id ? "#3b82f6" : "#64748b",
                  borderBottom: activeTab === tab.id ? "2px solid #3b82f6" : "none",
                  transition: "all 0.2s"
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              {/* Basic Information */}
              <div>
                <h4 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px", color: "#1e293b" }}>
                  Basic Information
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <DetailRow label="Asset Code" value={asset.assetCode || asset.code} />
                  <DetailRow label="Serial Number" value={asset.serialNumber || "N/A"} />
                  <DetailRow label="Type" value={asset.type || "N/A"} />
                  <DetailRow label="Category" value={asset.category} />
                  <DetailRow
                    label="Status"
                    value={
                      <span className={`status-pill status-${asset.status?.toLowerCase().replace(/\s+/g, '-')}`}>
                        {asset.status}
                      </span>
                    }
                  />
                </div>
              </div>

              {/* Location & Assignment */}
              <div>
                <h4 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px", color: "#1e293b" }}>
                  Location & Assignment
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <DetailRow label="Location" value={asset.location} />
                  <DetailRow label="Sub Location" value={asset.subLocation || "N/A"} />
                  <DetailRow label="Department" value={asset.department || "N/A"} />
                  <DetailRow
                    label="Custodian"
                    value={asset.custodian?.name || asset.custodian || "N/A"}
                  />
                  <DetailRow
                    label="Current Location"
                    value={
                      asset.currentLocation?.type === "EMPLOYEE"
                        ? asset.currentLocation?.employee?.name || "Employee"
                        : asset.currentLocation?.type === "MAINTENANCE_SHOP"
                          ? asset.currentLocation?.shop?.name || "Maintenance Shop"
                          : "Store"
                    }
                  />
                </div>
              </div>

              {/* Financial Information */}
              <div>
                <h4 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px", color: "#1e293b" }}>
                  Financial Information
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <DetailRow label="Purchase Cost" value={formatCurrency(asset.purchaseCost)} />
                  <DetailRow label="Purchase Date" value={formatDate(asset.purchaseDate)} />
                  {asset.disposalDetails && (
                    <DetailRow label="Disposal Value" value={formatCurrency(asset.disposalDetails.disposalValue)} />
                  )}
                </div>
              </div>

              {/* Warranty Information */}
              <div>
                <h4 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px", color: "#1e293b" }}>
                  Warranty Information
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <DetailRow
                    label="Warranty Period"
                    value={asset.warrantyPeriod ? `${asset.warrantyPeriod} years` : "N/A"}
                  />
                  <DetailRow label="Warranty Expiry" value={formatDate(asset.warrantyExpiryDate)} />
                  <DetailRow
                    label="Warranty Status"
                    value={
                      <span style={{ color: warrantyStatus.color, fontWeight: "500" }}>
                        {warrantyStatus.status}
                      </span>
                    }
                  />
                  <DetailRow label="Service Due Date" value={formatDate(asset.serviceDueDate)} />
                </div>
              </div>
            </div>
          )}

          {/* Maintenance Tab */}
          {activeTab === "maintenance" && (
            <div>
              {asset.maintenanceLogs?.length === 0 || !asset.maintenanceLogs ? (
                <EmptyState
                  icon="🔧"
                  message="No maintenance records"
                  description="Schedule maintenance to start tracking service history"
                />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {asset.maintenanceLogs.map((log, index) => (
                    <div
                      key={index}
                      style={{
                        padding: "16px",
                        background: "#f8fafc",
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                        <div style={{ fontWeight: "600" }}>{log.serviceType?.name || log.serviceType || "N/A"}</div>
                        <div style={{ fontSize: "13px", color: "#64748b" }}>
                          {formatCurrency(log.cost)}
                        </div>
                      </div>
                      <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "8px" }}>
                        {log.provider?.name || log.provider || "N/A"}
                      </div>
                      <div style={{ display: "flex", gap: "16px", fontSize: "12px" }}>
                        <span>Scheduled: {formatDate(log.scheduledDate)}</span>
                        {log.completedDate && (
                          <span>Completed: {formatDate(log.completedDate)}</span>
                        )}
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: "10px",
                            background: log.status === "Completed" ? "#f0fdf4" : "#fffbeb",
                            color: log.status === "Completed" ? "#16a34a" : "#f59e0b"
                          }}
                        >
                          {log.status}
                        </span>
                      </div>
                      {log.description && (
                        <div style={{ marginTop: "8px", fontSize: "13px", color: "#475569" }}>
                          {log.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === "documents" && (
            <div>
              {asset.documents?.length === 0 || !asset.documents ? (
                <EmptyState
                  icon="📄"
                  message="No documents uploaded"
                  description="Upload invoices, LPOs, warranty certificates"
                />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {asset.documents.map((doc, index) => (
                    <div
                      key={index}
                      style={{
                        padding: "16px",
                        background: "#f8fafc",
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ fontSize: "24px" }}>📄</div>
                        <div>
                          <div style={{ fontWeight: "500" }}>{doc.fileName}</div>
                          <div style={{ fontSize: "12px", color: "#64748b" }}>
                            {doc.type} • Uploaded {formatDate(doc.uploadedAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* AMC Tab */}
          {activeTab === "amc" && (
            <div>
              {!asset.amcDetails?.provider ? (
                <EmptyState
                  icon="📝"
                  message="No AMC details"
                  description="Add AMC contract information to track maintenance coverage"
                />
              ) : (
                <div style={{
                  padding: "20px",
                  background: "#f8fafc",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0"
                }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                    <DetailRow label="Provider" value={asset.amcDetails.provider} />
                    <DetailRow label="Contract Number" value={asset.amcDetails.contractNumber || "N/A"} />
                    <DetailRow label="Start Date" value={formatDate(asset.amcDetails.startDate)} />
                    <DetailRow label="End Date" value={formatDate(asset.amcDetails.endDate)} />
                    <DetailRow label="Cost" value={formatCurrency(asset.amcDetails.cost)} />
                    <DetailRow
                      label="Status"
                      value={
                        <span style={{
                          padding: "4px 12px",
                          borderRadius: "12px",
                          background: asset.amcDetails.status === "Active" ? "#f0fdf4" : "#fef2f2",
                          color: asset.amcDetails.status === "Active" ? "#16a34a" : "#dc2626",
                          fontSize: "12px",
                          fontWeight: "500"
                        }}>
                          {asset.amcDetails.status}
                        </span>
                      }
                    />
                  </div>
                  {asset.amcDetails.coverageDetails && (
                    <div style={{ marginTop: "16px" }}>
                      <div style={{ fontSize: "13px", fontWeight: "600", marginBottom: "8px", color: "#475569" }}>
                        Coverage Details
                      </div>
                      <div style={{ fontSize: "13px", color: "#64748b" }}>
                        {asset.amcDetails.coverageDetails}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Disposal Details (if disposed) */}
          {asset.status === "Disposed" && asset.disposalDetails && (
            <div style={{
              marginTop: "20px",
              padding: "16px",
              background: "#fef2f2",
              borderRadius: "8px",
              border: "1px solid #fecaca"
            }}>
              <h4 style={{
                fontSize: "14px",
                fontWeight: "600",
                marginBottom: "12px",
                color: "#dc2626",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <span>⚠️</span> Disposal Information
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px" }}>
                <DetailRow label="Disposal Date" value={formatDate(asset.disposalDetails.disposalDate)} />
                <DetailRow label="Method" value={asset.disposalDetails.disposalMethod} />
                <DetailRow label="Value" value={formatCurrency(asset.disposalDetails.disposalValue)} />
                <DetailRow label="Reason" value={asset.disposalDetails.disposalReason} />
              </div>
              {asset.disposalDetails.remarks && (
                <div style={{ marginTop: "12px", fontSize: "13px", color: "#991b1b" }}>
                  <strong>Remarks:</strong> {asset.disposalDetails.remarks}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// Helper Components
// const DetailRow = ({ label, value }) => (
//   <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
//     <div style={{ fontSize: "13px", color: "#64748b" }}>{label}</div>
//     <div style={{ fontSize: "13px", fontWeight: "500", color: "#1e293b", textAlign: "right" }}>
//       {value}
//     </div>
//   </div>
// );


// Helper Components
const DetailRow = ({ label, value }) => {
  const renderValue = () => {
    if (value === null || value === undefined) return "N/A";

    // JSX passed (status pills, spans, etc.)
    if (React.isValidElement(value)) return value;

    // Handle object values safely
    if (typeof value === "object") {
      // Custodian populated as { _id, name, code }
      if (value.name) return value.name;

      // Current location populated object
      if (value.type === "EMPLOYEE" && value.employee) {
        return value.employee.name || "Employee";
      }

      if (value.type === "MAINTENANCE_SHOP" && value.shop) {
        return value.shop.name || "Maintenance Shop";
      }

      if (value.type) return value.type;

      return "N/A";
    }

    return value;
  };

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ fontSize: "13px", color: "#64748b" }}>{label}</div>
      <div style={{ fontSize: "13px", fontWeight: "500", color: "#1e293b", textAlign: "right" }}>
        {renderValue()}
      </div>
    </div>
  );
};


const EmptyState = ({ icon, message, description }) => (
  <div style={{
    textAlign: "center",
    padding: "40px",
    background: "#f8fafc",
    borderRadius: "8px",
    color: "#64748b"
  }}>
    <div style={{ fontSize: "48px", marginBottom: "12px" }}>{icon}</div>
    <div style={{ fontWeight: "500", marginBottom: "4px" }}>{message}</div>
    <div style={{ fontSize: "12px" }}>{description}</div>
  </div>
);