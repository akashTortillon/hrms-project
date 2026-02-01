

import React from "react";
import "../../style/WarrantyAmcTrackerCard.css";
import SvgIcon from "../../components/svgIcon/svgView";

import Card from "../../components/reusable/Card";

export default function WarrantyAmcTrackerCard({ assets = [], onViewAll }) {

  // Calculate warranty expiry for assets with warranty period
  const getWarrantyStatus = (asset) => {
    if (!asset.warrantyPeriod || !asset.purchaseDate) {
      return { status: "no-warranty", text: "No Warranty", daysLeft: null };
    }

    const purchaseDate = new Date(asset.purchaseDate);
    const expiryDate = new Date(purchaseDate);
    expiryDate.setFullYear(
      purchaseDate.getFullYear() + parseInt(asset.warrantyPeriod)
    );

    const today = new Date();
    const daysLeft = Math.ceil(
      (expiryDate - today) / (1000 * 60 * 60 * 24)
    );

    if (daysLeft < 0) {
      return { status: "expired", text: "Expired", daysLeft: Math.abs(daysLeft) };
    } else if (daysLeft <= 30) {
      return { status: "expiring-soon", text: "Expiring Soon", daysLeft };
    } else {
      return { status: "active", text: "Active", daysLeft };
    }
  };

  // Filter assets that have warranty info
  const assetsWithWarranty = assets.filter(
    (asset) => asset.warrantyPeriod && asset.purchaseDate
  );

  // Only count active warranties and exclude disposed assets
  const activeWarrantyAssets = assetsWithWarranty.filter(
    (asset) =>
      getWarrantyStatus(asset).status === "active" &&
      asset.status !== "Disposed"
  );

  // Sort by expiry (expired first, then nearest)
  const sortedAssets = [...assetsWithWarranty]
    .sort((a, b) => {
      const aStatus = getWarrantyStatus(a);
      const bStatus = getWarrantyStatus(b);

      if (aStatus.status === "expired" && bStatus.status !== "expired") return -1;
      if (aStatus.status !== "expired" && bStatus.status === "expired") return 1;

      return (aStatus.daysLeft || 999) - (bStatus.daysLeft || 999);
    })
    .slice(0, 5);

  const getStatusColor = (status) => {
    switch (status) {
      case "expired":
        return "#dc2626";
      case "expiring-soon":
        return "#f59e0b";
      case "active":
        return "#16a34a";
      default:
        return "#6b7280";
    }
  };

  const getStatusBg = (status) => {
    switch (status) {
      case "expired":
        return "#fef2f2";
      case "expiring-soon":
        return "#fffbeb";
      case "active":
        return "#f0fdf4";
      default:
        return "#f8fafc";
    }
  };

  return (
    <Card className="warranty-card" luxury={true}>
      {/* Header */}
      <div className="warranty-card-header">
        <div>
          <h3 className="warranty-title">Warranty & AMC Tracker</h3>
          <p className="warranty-subtitle">
            Monitor warranty and maintenance contract expiries
          </p>
        </div>

        {/* <button className="warranty-view-all" onClick={onViewAll}>
          View All
        </button> */}
      </div>

      {/* List */}
      <div className="warranty-list">
        {sortedAssets.length === 0 ? (
          <div className="warranty-empty">
            <div className="warranty-empty-icon">
              <SvgIcon name="cube" size={24} />
            </div>
            <div className="warranty-empty-text">
              <div>No assets with warranty information</div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#64748b",
                  marginTop: "4px",
                }}
              >
                Add warranty period when creating assets to track expiry
              </div>
            </div>
          </div>
        ) : (
          sortedAssets.map((asset) => {
            const warrantyStatus = getWarrantyStatus(asset);
            const isDisposed = asset.status === "Disposed";

            return (
              <div key={asset.code || asset.id} className="warranty-item">
                {/* Left */}
                <div className="warranty-left">
                  <div className="warranty-icon">
                    <SvgIcon name="cube" size={24} />
                  </div>

                  <div className="warranty-info">
                    <div className="warranty-name">{asset.name}</div>
                    <div className="warranty-code">{asset.code}</div>
                  </div>
                </div>

                {/* Right */}
                <div className="warranty-right">
                  {isDisposed ? (
                    <div className="warranty-inactive">Inactive</div>
                  ) : (
                    <>
                      <div
                        className="warranty-status"
                        style={{
                          color: getStatusColor(warrantyStatus.status),
                          backgroundColor: getStatusBg(warrantyStatus.status),
                        }}
                      >
                        {warrantyStatus.text}
                      </div>

                      <div className="warranty-days">
                        {warrantyStatus.status === "expired"
                          ? `${warrantyStatus.daysLeft} days ago`
                          : `${warrantyStatus.daysLeft} days left`}
                      </div>

                      <div className="warranty-expiry">
                        {asset.warrantyExpiryDate &&
                          new Date(asset.warrantyExpiryDate).toLocaleDateString()}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Summary */}
      {sortedAssets.length > 0 && (
        <div className="warranty-summary">
          <div className="warranty-summary-item">
            <span className="warranty-summary-label">Total Active Warranties:</span>
            <span className="warranty-summary-value">
              {activeWarrantyAssets.length}
            </span>
          </div>

          <div className="warranty-summary-item">
            <span className="warranty-summary-label">Expired:</span>
            <span
              className="warranty-summary-value"
              style={{ color: "#dc2626" }}
            >
              {assetsWithWarranty.filter(
                (a) => getWarrantyStatus(a).status === "expired" && a.status !== "Disposed"
              ).length}
            </span>
          </div>

          <div className="warranty-summary-item">
            <span className="warranty-summary-label">Expiring Soon:</span>
            <span
              className="warranty-summary-value"
              style={{ color: "#f59e0b" }}
            >
              {assetsWithWarranty.filter(
                (a) => getWarrantyStatus(a).status === "expiring-soon" && a.status !== "Disposed"
              ).length}
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}
