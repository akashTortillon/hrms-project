import React, { useState } from "react";
import DataTable from "../../components/reusable/DataTable";
import SvgIcon from "../../components/svgIcon/svgView";
import "../../style/Assets.css";

export default function MaintenanceLogsModal({ onClose, asset, onUpdate, onDelete }) {
  const [editingLog, setEditingLog] = useState(null);
  const [form, setForm] = useState({
    completedDate: "",
    status: "",
    cost: "",
    description: ""
  });

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      "Scheduled": "#f59e0b",
      "In Progress": "#3b82f6",
      "Completed": "#16a34a",
      "Cancelled": "#dc2626"
    };
    return colors[status] || "#6b7280";
  };

  const handleEditClick = (log) => {
    setEditingLog(log);
    setForm({
      completedDate: log.completedDate 
        ? new Date(log.completedDate).toISOString().split('T')[0] 
        : "",
      status: log.status || "",
      cost: log.cost || "",
      description: log.description || ""
    });
  };

  const handleUpdateSubmit = () => {
    if (!form.status) {
      alert("Please select a status");
      return;
    }

    onUpdate(asset._id || asset.id, editingLog._id, form);
    setEditingLog(null);
    setForm({ completedDate: "", status: "", cost: "", description: "" });
  };

  const handleDeleteClick = (log) => {
    if (window.confirm("Are you sure you want to delete this maintenance log?")) {
      onDelete(asset._id || asset.id, log._id);
    }
  };

  const columns = [
    {
      key: "scheduledDate",
      header: "SCHEDULED DATE",
      width: "15%",
      render: (row) => formatDate(row.scheduledDate)
    },
    {
      key: "serviceType",
      header: "SERVICE TYPE",
      width: "20%",
      render: (row) => row.serviceType
    },
    {
      key: "provider",
      header: "PROVIDER",
      width: "20%",
      render: (row) => row.provider
    },
    {
      key: "cost",
      header: "COST",
      width: "12%",
      render: (row) => `AED ${row.cost?.toLocaleString() || 0}`
    },
    {
      key: "status",
      header: "STATUS",
      width: "13%",
      render: (row) => (
        <span 
          style={{ 
            padding: "4px 12px", 
            borderRadius: "12px", 
            fontSize: "12px",
            fontWeight: "500",
            backgroundColor: getStatusColor(row.status) + "20",
            color: getStatusColor(row.status)
          }}
        >
          {row.status}
        </span>
      )
    },
    {
      key: "actions",
      header: "ACTIONS",
      width: "20%",
      render: (row) => (
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            className="icon-btn edit-btn"
            onClick={() => handleEditClick(row)}
            title="Edit Log"
          >
            <SvgIcon name="edit" size={16} />
          </button>
          <button
            className="icon-btn delete-btn"
            onClick={() => handleDeleteClick(row)}
            title="Delete Log"
          >
            <SvgIcon name="delete" size={16} />
          </button>
        </div>
      )
    }
  ];

  const maintenanceLogs = asset?.maintenanceLogs || [];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-container" 
        style={{ maxWidth: "1000px", width: "95%" }} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>Maintenance Logs - {asset?.name}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Asset Info */}
          <div style={{ 
            background: "#f8fafc", 
            padding: "16px", 
            borderRadius: "8px", 
            marginBottom: "20px",
            border: "1px solid #e2e8f0"
          }}>
            <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                  Asset Code
                </div>
                <div style={{ fontWeight: "500" }}>
                  {asset?.assetCode || asset?.code || "N/A"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                  Total Logs
                </div>
                <div style={{ fontWeight: "500" }}>
                  {maintenanceLogs.length}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                  Total Cost
                </div>
                <div style={{ fontWeight: "500" }}>
                  AED {maintenanceLogs.reduce((sum, log) => sum + (log.cost || 0), 0).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Edit Form */}
          {editingLog && (
            <div style={{ 
              background: "#f0f9ff", 
              padding: "16px", 
              borderRadius: "8px", 
              marginBottom: "20px",
              border: "1px solid #bae6fd"
            }}>
              <h4 style={{ marginBottom: "16px", fontSize: "14px", fontWeight: "600" }}>
                Update Maintenance Log
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", marginBottom: "6px" }}>
                    Completed Date
                  </label>
                  <input
                    type="date"
                    value={form.completedDate}
                    onChange={(e) => setForm({ ...form, completedDate: e.target.value })}
                    style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", marginBottom: "6px" }}>
                    Status *
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db" }}
                  >
                    <option value="">Select Status</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", marginBottom: "6px" }}>
                    Actual Cost (AED)
                  </label>
                  <input
                    type="number"
                    value={form.cost}
                    onChange={(e) => setForm({ ...form, cost: e.target.value })}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", marginBottom: "6px" }}>
                    Description
                  </label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Additional notes..."
                    style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db" }}
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                <button 
                  className="btn-primary" 
                  onClick={handleUpdateSubmit}
                  style={{ fontSize: "13px", padding: "6px 12px" }}
                >
                  Update Log
                </button>
                <button 
                  className="btn-secondary" 
                  onClick={() => setEditingLog(null)}
                  style={{ fontSize: "13px", padding: "6px 12px" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Maintenance Logs Table */}
          {maintenanceLogs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>🔧</div>
              <div>No maintenance logs found</div>
              <div style={{ fontSize: "12px", marginTop: "8px" }}>
                Schedule maintenance to start tracking service history
              </div>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={maintenanceLogs}
              rowKey="_id"
              pagination={false}
              className="maintenance-logs-table"
            />
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}