






import React, { useState, useEffect } from "react";
import DataTable from "../../components/reusable/DataTable";
import SvgIcon from "../../components/svgIcon/svgView";
import { getAssetHistory } from "../../services/assignmentService.js";
import "../../style/Assets.css";

export default function AssetHistoryModal({ onClose, asset }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [assetInfo, setAssetInfo] = useState(null);
  const [assignmentHistory, setAssignmentHistory] = useState([]);
  const [maintenanceHistory, setMaintenanceHistory] = useState([]);

  useEffect(() => {
    fetchAssetHistory();
  }, []);

  const fetchAssetHistory = async () => {
    try {
      setLoading(true);
      const response = await getAssetHistory(asset._id || asset.id);
      const allHistory = response.history || [];
      setHistory(allHistory);
      setAssetInfo(response.asset);

      // Split history into Assignment and Maintenance sections
      const assignments = [];
      const maintenance = [];

      allHistory.forEach((item) => {
        if (
          item.actionType === "TRANSFER_TO_MAINTENANCE" ||
          item.actionType === "RETURN_FROM_MAINTENANCE"
        ) {
          maintenance.push(item);
        } else if (
          item.actionType === "ASSIGN" ||
          item.actionType === "TRANSFER_TO_EMPLOYEE" ||
          item.actionType === "TRANSFER_TO_DEPARTMENT" ||
          item.actionType === "TRANSFER_TO_STORE" ||
          item.actionType === "RETURN"
        ) {
          assignments.push(item);
        }
      });

      setAssignmentHistory(assignments);
      setMaintenanceHistory(maintenance);
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
      "TRANSFER_TO_EMPLOYEE": "Transferred to Employee",
      "TRANSFER_TO_DEPARTMENT": "Transferred to Department",
      "TRANSFER_TO_STORE": "Transferred to Store",
      "TRANSFER_TO_MAINTENANCE": "Sent to Maintenance",
      "RETURN_FROM_MAINTENANCE": "Returned from Maintenance",
      "RETURN": "Returned to Store"
    };
    return actionMap[actionType] || actionType;
  };

  const getFromToDisplay = (item) => {
    let fromName = item.from?.name || "Store";
    let toName = item.to?.name || "Store";

    if (item.from?.type === "DEPARTMENT") fromName = `${item.from.department} (Dept)`;
    if (item.to?.type === "DEPARTMENT") toName = `${item.to.department} (Dept)`;

    return `${fromName} → ${toName}`;
  };

  // Assignment History Columns
  const assignmentColumns = [
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
          {row.to.type === "EMPLOYEE" && row.to.employee?.department && (
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

  // Maintenance History Columns (with Service Cost)
  const maintenanceColumns = [
    {
      key: "action",
      header: "ACTION",
      width: "18%",
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
      width: "22%",
      render: (row) => (
        <div className="cell-stack">
          <div className="cell-primary">
            {getFromToDisplay(row)}
          </div>
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
      width: "18%",
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
      key: "serviceCost",
      header: "SERVICE COST",
      width: "12%",
      render: (row) => (
        <div className="cell-primary" style={{ fontWeight: "600", color: "#059669" }}>
          {row.serviceCost ? `AED ${row.serviceCost.toFixed(2)}` : "-"}
        </div>
      ),
    },
    {
      key: "remarks",
      header: "REMARKS",
      width: "15%",
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
                      ? assetInfo.currentLocation?.employee?.name || "Employee"
                      : assetInfo.currentLocation?.type === "MAINTENANCE_SHOP"
                        ? assetInfo.currentLocation?.shop?.name || "Maintenance Shop"
                        : assetInfo.custodian?.type === "DEPARTMENT"
                          ? assetInfo.custodian?.department || "Department"
                          : "Store"
                    }
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px" }}>
              <div>Loading history...</div>
            </div>
          ) : (
            <>
              {/* Section A: Assignment History */}
              <div style={{ marginBottom: "30px" }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "12px",
                  paddingBottom: "8px",
                  borderBottom: "2px solid #3b82f6"
                }}>
                  <SvgIcon name="users" size={18} color="#3b82f6" />
                  <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#1e293b" }}>
                    Assignment History
                  </h4>
                  <span style={{
                    fontSize: "12px",
                    color: "#64748b",
                    background: "#f1f5f9",
                    padding: "2px 8px",
                    borderRadius: "12px"
                  }}>
                    {assignmentHistory.length} records
                  </span>
                </div>

                {assignmentHistory.length === 0 ? (
                  <div style={{
                    textAlign: "center",
                    padding: "30px",
                    background: "#f8fafc",
                    borderRadius: "8px",
                    color: "#64748b"
                  }}>
                    No assignment history found
                  </div>
                ) : (
                  <DataTable
                    columns={assignmentColumns}
                    data={assignmentHistory}
                    rowKey="id"
                    pagination={false}
                    className="history-table"
                  />
                )}
              </div>

              {/* Section B: Maintenance History */}
              <div>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "12px",
                  paddingBottom: "8px",
                  borderBottom: "2px solid #f59e0b"
                }}>
                  <SvgIcon name="spanner" size={18} color="#f59e0b" />
                  <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#1e293b" }}>
                    Maintenance History
                  </h4>
                  <span style={{
                    fontSize: "12px",
                    color: "#64748b",
                    background: "#fef3c7",
                    padding: "2px 8px",
                    borderRadius: "12px"
                  }}>
                    {maintenanceHistory.length} records
                  </span>
                </div>

                {maintenanceHistory.length === 0 ? (
                  <div style={{
                    textAlign: "center",
                    padding: "30px",
                    background: "#fffbeb",
                    borderRadius: "8px",
                    color: "#92400e"
                  }}>
                    No maintenance history found
                  </div>
                ) : (
                  <DataTable
                    columns={maintenanceColumns}
                    data={maintenanceHistory}
                    rowKey="id"
                    pagination={false}
                    className="history-table"
                  />
                )}
              </div>

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
                  Assignment: {assignmentHistory.length} •
                  Maintenance: {maintenanceHistory.length} •
                  Active: {history.filter(h => h.isActive).length}
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}