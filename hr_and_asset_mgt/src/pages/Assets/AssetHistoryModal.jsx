import React, { useState, useEffect } from "react";
import DataTable from "../../components/reusable/DataTable";
import SvgIcon from "../../components/svgIcon/svgView";
import { getAssetHistory } from "../../services/assignmentService.js";
import "../../style/Assets.css";

export default function AssetHistoryModal({ onClose, asset }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [assetInfo, setAssetInfo] = useState(null);

  useEffect(() => {
    fetchAssetHistory();
  }, []);

  const fetchAssetHistory = async () => {
    try {
      setLoading(true);
      const response = await getAssetHistory(asset._id || asset.id);
      setHistory(response.history || []);
      setAssetInfo(response.asset);
    } catch (error) {
      console.error("Failed to fetch asset history", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getActionTypeDisplay = (actionType) => {
    const actionMap = {
      "ASSIGN": "Assigned",
      "TRANSFER_TO_MAINTENANCE": "Transferred to Maintenance",
      "RETURN_FROM_MAINTENANCE": "Returned from Maintenance",
      "RETURN": "Returned to Store"
    };
    return actionMap[actionType] || actionType;
  };

  const getFromToDisplay = (item) => {
    if (item.from.type === "STORE") {
      return `Store → ${item.to.name}`;
    } else if (item.from.type === "EMPLOYEE") {
      return `${item.from.name} → ${item.to.name}`;
    } else if (item.from.type === "MAINTENANCE_SHOP") {
      return `${item.from.name} → ${item.to.name}`;
    }
    return `${item.from.name} → ${item.to.name}`;
  };

  const columns = [
    {
      key: "action",
      header: "ACTION",
      width: "20%",
      render: (row) => (
        <div className="cell-stack">
          <div className="cell-primary" style={{ fontWeight: "600" }}>
            {getActionTypeDisplay(row.actionType)}
          </div>
          {row.isActive && (
            <div className="cell-secondary" style={{ color: "#16a34a", fontSize: "12px" }}>
              Current
            </div>
          )}
        </div>
      ),
    },
    {
      key: "fromTo",
      header: "FROM → TO",
      width: "25%",
      render: (row) => (
        <div className="cell-stack">
          <div className="cell-primary">
            {getFromToDisplay(row)}
          </div>
          {row.to.type === "EMPLOYEE" && row.to.employee && (
            <div className="cell-secondary" style={{ fontSize: "12px" }}>
              {row.to.employee.department}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "STATUS AFTER",
      width: "15%",
      render: (row) => (
        <span className={`status-pill status-${row.statusAfterAction?.toLowerCase().replace(/\s+/g, '-')}`}>
          {row.statusAfterAction}
        </span>
      ),
    },
    {
      key: "date",
      header: "DATE",
      width: "20%",
      render: (row) => (
        <div className="cell-stack">
          <div className="cell-primary">{formatDate(row.date)}</div>
          {row.returnedAt && (
            <div className="cell-secondary" style={{ fontSize: "12px" }}>
              Returned: {formatDate(row.returnedAt)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "remarks",
      header: "REMARKS",
      width: "20%",
      render: (row) => (
        <div className="cell-stack">
          <div className="cell-primary" style={{ fontSize: "13px" }}>
            {row.remarks || "-"}
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" style={{ maxWidth: "1200px", width: "95%" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Asset History</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Asset Info */}
          {assetInfo && (
            <div style={{ 
              background: "#f8fafc", 
              padding: "16px", 
              borderRadius: "8px", 
              marginBottom: "20px",
              border: "1px solid #e2e8f0"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ 
                  width: "40px", 
                  height: "40px", 
                  borderRadius: "8px", 
                  background: "#3b82f6", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center" 
                }}>
                  <SvgIcon name="cube" size={20} color="white" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "600", fontSize: "16px", marginBottom: "4px" }}>
                    {assetInfo.name}
                  </div>
                  <div style={{ color: "#64748b", fontSize: "14px" }}>
                    {assetInfo.assetCode} • {assetInfo.currentStatus}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                    Current Location
                  </div>
                  <div style={{ fontWeight: "500", fontSize: "14px" }}>
                    {assetInfo.currentLocation?.type === "EMPLOYEE" 
                      ? assetInfo.currentLocation?.employee?.name
                      : assetInfo.currentLocation?.type === "MAINTENANCE_SHOP"
                      ? assetInfo.currentLocation?.shop?.name
                      : "Store"
                    }
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* History Table */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px" }}>
              <div>Loading history...</div>
            </div>
          ) : history.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px" }}>
              <div style={{ color: "#64748b", marginBottom: "16px" }}>
                No history found for this asset
              </div>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={history}
              rowKey="id"
              pagination={false}
              className="history-table"
            />
          )}

          {/* Summary */}
          {!loading && history.length > 0 && (
            <div style={{ 
              marginTop: "20px", 
              padding: "12px", 
              background: "#f1f5f9", 
              borderRadius: "6px",
              fontSize: "13px",
              color: "#475569"
            }}>
              Total Records: {history.length} • 
              Active Assignment: {history.filter(h => h.isActive).length}
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
