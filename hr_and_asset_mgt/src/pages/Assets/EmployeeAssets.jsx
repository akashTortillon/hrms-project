import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import SvgIcon from "../../components/svgIcon/svgView";
import DataTable from "../../components/reusable/DataTable";
import AssetHistoryModal from "./AssetHistoryModal";
import AssetDetailsModal from "./AssetDetailsModal";
import { getEmployeeAssets } from "../../services/assetService";
import { toast } from "react-toastify";
import "../../style/Assets.css";

export default function EmployeeAssets() {
  const { employeeId } = useParams(); // If viewing specific employee
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchEmployeeAssets();
  }, [employeeId]);

  const fetchEmployeeAssets = async () => {
    try {
      setLoading(true);
      // If employeeId is provided, use it; otherwise fetch for current user
      const response = await getEmployeeAssets(employeeId);
      const assetsArray = Array.isArray(response) ? response : [];
      setAssets(assetsArray);
    } catch (error) {
      console.error("Failed to fetch employee assets", error);
      toast.error("Failed to load assets");
    } finally {
      setLoading(false);
    }
  };

  const handleViewHistory = (asset) => {
    setSelectedAsset(asset);
    setShowHistoryModal(true);
  };

  const handleViewDetails = (asset) => {
    setSelectedAsset(asset);
    setShowDetailsModal(true);
  };

  const getWarrantyStatus = (asset) => {
    if (!asset.warrantyExpiryDate) return { text: "N/A", color: "#6b7280" };
    
    const today = new Date();
    const expiryDate = new Date(asset.warrantyExpiryDate);
    const daysLeft = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) return { text: "Expired", color: "#dc2626" };
    if (daysLeft <= 30) return { text: `${daysLeft} days left`, color: "#f59e0b" };
    return { text: "Active", color: "#16a34a" };
  };

  const columns = [
    {
      key: "asset",
      header: "ASSET",
      width: "25%",
      render: (row) => (
        <div className="asset-cell">
          <div className="asset-icon">
            <SvgIcon name="cube" size={18} />
          </div>
          <div>
            <div className="asset-name">{row.name}</div>
            <div className="asset-sub">
              {row.assetCode} • {row.category}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: "TYPE",
      width: "15%",
      render: (row) => row.type || "N/A"
    },
    {
      key: "serialNumber",
      header: "SERIAL NUMBER",
      width: "15%",
      render: (row) => row.serialNumber || "N/A"
    },
    {
      key: "location",
      header: "LOCATION",
      width: "15%",
      render: (row) => (
        <div className="cell-stack">
          <div className="cell-primary">{row.location}</div>
          {row.subLocation && (
            <div className="cell-secondary">{row.subLocation}</div>
          )}
        </div>
      ),
    },
    {
      key: "warranty",
      header: "WARRANTY",
      width: "15%",
      render: (row) => {
        const warranty = getWarrantyStatus(row);
        return (
          <span style={{ 
            color: warranty.color, 
            fontWeight: "500",
            fontSize: "13px"
          }}>
            {warranty.text}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "ACTIONS",
      width: "15%",
      render: (row) => (
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            className="icon-btn"
            onClick={() => handleViewDetails(row)}
            title="View Details"
            style={{ background: "#3b82f6", color: "white" }}
          >
            <SvgIcon name="eye" size={16} />
          </button>
          <button
            className="icon-btn history-btn"
            onClick={() => handleViewHistory(row)}
            title="View History"
            style={{ background: "#f59e0b", color: "white" }}
          >
            <SvgIcon name="history" size={16} />
          </button>
        </div>
      ),
    },
  ];

  // Calculate summary stats
  const totalAssets = assets.length;
  const activeWarranties = assets.filter(a => {
    if (!a.warrantyExpiryDate) return false;
    const daysLeft = Math.ceil((new Date(a.warrantyExpiryDate) - new Date()) / (1000 * 60 * 60 * 24));
    return daysLeft > 0;
  }).length;

  return (
    <div style={{ padding: "20px" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: "600", marginBottom: "8px" }}>
          My Assets
        </h2>
        <p style={{ color: "#64748b", fontSize: "14px" }}>
          View and manage assets assigned to you
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
        gap: "16px",
        marginBottom: "24px"
      }}>
        <div style={{ 
          background: "white", 
          padding: "20px", 
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "#dbeafe",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <SvgIcon name="cube" size={20} color="#3b82f6" />
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                Total Assets
              </div>
              <div style={{ fontSize: "24px", fontWeight: "700", color: "#1e293b" }}>
                {totalAssets}
              </div>
            </div>
          </div>
        </div>

        <div style={{ 
          background: "white", 
          padding: "20px", 
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "#dcfce7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <SvgIcon name="check-circle" size={20} color="#16a34a" />
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                Active Warranties
              </div>
              <div style={{ fontSize: "24px", fontWeight: "700", color: "#1e293b" }}>
                {activeWarranties}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Assets Table */}
      <div style={{ 
        background: "white", 
        borderRadius: "12px", 
        border: "1px solid #e2e8f0",
        overflow: "hidden"
      }}>
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
            Loading your assets...
          </div>
        ) : assets.length === 0 ? (
          <div style={{ padding: "60px", textAlign: "center" }}>
            <div style={{ fontSize: "64px", marginBottom: "16px" }}>📦</div>
            <div style={{ fontSize: "18px", fontWeight: "600", color: "#1e293b", marginBottom: "8px" }}>
              No Assets Assigned
            </div>
            <div style={{ fontSize: "14px", color: "#64748b" }}>
              You don't have any assets assigned to you at the moment
            </div>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={assets}
            rowKey="_id"
            className="employee-assets-table"
          />
        )}
      </div>

      {/* Modals */}
      {showHistoryModal && selectedAsset && (
        <AssetHistoryModal
          asset={selectedAsset}
          onClose={() => {
            setShowHistoryModal(false);
            setSelectedAsset(null);
          }}
        />
      )}

      {showDetailsModal && selectedAsset && (
        <AssetDetailsModal
          asset={selectedAsset}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedAsset(null);
          }}
        />
      )}
    </div>
  );
}