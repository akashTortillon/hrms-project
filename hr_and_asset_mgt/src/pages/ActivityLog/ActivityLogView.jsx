import { useState, useEffect, useCallback } from "react";
import { getActivityLogs, getActivityStats, exportActivityLogs, clearOldLogs } from "../../services/activityLogService.js";
import { toast } from "react-toastify";

const ACTION_COLORS = {
  LOGIN:          { bg: "#eff6ff", color: "#1d4ed8" },
  LOGOUT:         { bg: "#f3f4f6", color: "#6b7280" },
  CREATE:         { bg: "#f0fdf4", color: "#166534" },
  UPDATE:         { bg: "#fef3c7", color: "#92400e" },
  DELETE:         { bg: "#fef2f2", color: "#991b1b" },
  APPROVE:        { bg: "#f0fdf4", color: "#15803d" },
  REJECT:         { bg: "#fef2f2", color: "#dc2626" },
  EXPORT:         { bg: "#faf5ff", color: "#7e22ce" },
  IMPORT:         { bg: "#faf5ff", color: "#7e22ce" },
  FILE_UPLOAD:    { bg: "#eff6ff", color: "#2563eb" },
  FILE_DOWNLOAD:  { bg: "#eff6ff", color: "#2563eb" },
  PASSWORD_RESET: { bg: "#fff7ed", color: "#c2410c" },
  VIEW:           { bg: "#f9fafb", color: "#374151" },
};

const MODULES = ["AUTH","EMPLOYEE","ATTENDANCE","PAYROLL","REQUESTS","ASSETS","DOCUMENTS","REPORTS","ANNOUNCEMENTS","APPRAISALS","WARNINGS","MASTERS","SETTINGS","OTHER"];
const ACTIONS = ["LOGIN","LOGOUT","CREATE","UPDATE","DELETE","VIEW","APPROVE","REJECT","EXPORT","IMPORT","PASSWORD_RESET","FILE_UPLOAD","FILE_DOWNLOAD"];

const selectStyle = {
  padding: "8px 12px", borderRadius: "8px",
  border: "1px solid #d1d5db", fontSize: "13px",
  background: "white", height: "36px"
};

export default function ActivityLogView() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });

  const [filters, setFilters] = useState({
    search: "", action: "", module: "", status: "",
    startDate: "", endDate: "", page: 1, limit: 50
  });

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearDays, setClearDays] = useState(90);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== "" && v !== null)
      );
      const res = await getActivityLogs(params);
      setLogs(res.data || []);
      setPagination(res.pagination || { total: 0, page: 1, totalPages: 1 });
    } catch {
      toast.error("Failed to load activity logs");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadStats = async () => {
    try {
      const res = await getActivityStats();
      setStats(res.data);
    } catch { /* silent */ }
  };

  useEffect(() => { loadLogs(); }, [loadLogs]);
  useEffect(() => { loadStats(); }, []);

  const handleExport = async () => {
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== "" && v !== null)
      );
      const blob = await exportActivityLogs(params);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `Activity_Log_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Activity log exported");
    } catch {
      toast.error("Export failed");
    }
  };

  const handleClear = async () => {
    try {
      const res = await clearOldLogs(clearDays);
      toast.success(res.message);
      setShowClearConfirm(false);
      loadLogs();
      loadStats();
    } catch {
      toast.error("Failed to clear logs");
    }
  };

  const setFilter = (key, value) =>
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));

  const formatDate = (d) =>
    new Date(d).toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });

  return (
    <div style={{ padding: "0 0 40px 0" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ margin: 0, fontSize: "22px", fontWeight: "800", color: "#111827" }}>
          Activity Log
        </h2>
        <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: "14px" }}>
          Track all user actions across the system
        </p>
      </div>

      {/* Stats Row */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "14px", marginBottom: "24px" }}>
          <StatCard label="Total Logs" value={stats.totalLogs} color="#2563eb" />
          <StatCard label="Last 30 Days" value={stats.recentLogs} color="#16a34a" />
          {stats.byAction?.slice(0, 3).map(a => (
            <StatCard key={a._id} label={a._id} value={a.count} color={ACTION_COLORS[a._id]?.color || "#6b7280"} />
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{
        background: "white", border: "1px solid #e5e7eb", borderRadius: "12px",
        padding: "16px 20px", marginBottom: "20px",
        display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center"
      }}>
        <input
          type="text"
          placeholder="Search user, email, description..."
          value={filters.search}
          onChange={e => setFilter("search", e.target.value)}
          style={{ ...selectStyle, minWidth: "220px", flex: 2 }}
        />
        <select style={selectStyle} value={filters.action} onChange={e => setFilter("action", e.target.value)}>
          <option value="">All Actions</option>
          {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select style={selectStyle} value={filters.module} onChange={e => setFilter("module", e.target.value)}>
          <option value="">All Modules</option>
          {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select style={selectStyle} value={filters.status} onChange={e => setFilter("status", e.target.value)}>
          <option value="">All Status</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILED">Failed</option>
        </select>
        <input type="date" style={selectStyle} value={filters.startDate} onChange={e => setFilter("startDate", e.target.value)} />
        <input type="date" style={selectStyle} value={filters.endDate} onChange={e => setFilter("endDate", e.target.value)} />

        {/* Actions */}
        <button
          onClick={handleExport}
          style={{ ...selectStyle, background: "#2563eb", color: "white", border: "none", cursor: "pointer", fontWeight: "600", padding: "8px 16px" }}
        >
          Export Excel
        </button>
        <button
          onClick={() => setShowClearConfirm(true)}
          style={{ ...selectStyle, background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", cursor: "pointer", fontWeight: "600", padding: "8px 16px" }}
        >
          Clear Old Logs
        </button>
      </div>

      {/* Count */}
      <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "12px" }}>
        Showing {logs.length} of {pagination.total} entries
      </div>

      {/* Table */}
      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "12px", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                {["Date & Time", "User", "Role", "Action", "Module", "Description", "Record", "IP", "Status"].map(h => (
                  <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontWeight: "600", color: "#374151", whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>Loading...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>No activity logs found</td></tr>
              ) : (
                logs.map((log, i) => {
                  const ac = ACTION_COLORS[log.action] || { bg: "#f3f4f6", color: "#374151" };
                  return (
                    <tr key={log._id || i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "10px 14px", whiteSpace: "nowrap", color: "#6b7280" }}>
                        {formatDate(log.createdAt)}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ fontWeight: "600", color: "#111827" }}>{log.userName}</div>
                        <div style={{ fontSize: "11px", color: "#9ca3af" }}>{log.userEmail}</div>
                      </td>
                      <td style={{ padding: "10px 14px", color: "#6b7280" }}>{log.userRole || "—"}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{
                          fontSize: "11px", fontWeight: "700", padding: "3px 8px",
                          borderRadius: "9999px", background: ac.bg, color: ac.color
                        }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{
                          fontSize: "11px", fontWeight: "600", padding: "3px 8px",
                          borderRadius: "6px", background: "#f3f4f6", color: "#374151"
                        }}>
                          {log.module}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px", color: "#374151", maxWidth: "280px" }}>
                        {log.description}
                      </td>
                      <td style={{ padding: "10px 14px", color: "#6b7280", fontSize: "12px" }}>
                        {log.targetName || "—"}
                      </td>
                      <td style={{ padding: "10px 14px", color: "#9ca3af", fontSize: "11px", whiteSpace: "nowrap" }}>
                        {log.ipAddress || "—"}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{
                          fontSize: "11px", fontWeight: "700", padding: "3px 8px",
                          borderRadius: "9999px",
                          background: log.status === "SUCCESS" ? "#f0fdf4" : "#fef2f2",
                          color: log.status === "SUCCESS" ? "#166534" : "#dc2626"
                        }}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: "8px", padding: "16px", borderTop: "1px solid #f3f4f6" }}>
            <button
              disabled={filters.page <= 1}
              onClick={() => setFilters(p => ({ ...p, page: p.page - 1 }))}
              style={{ padding: "6px 14px", borderRadius: "6px", border: "1px solid #d1d5db", background: "white", cursor: "pointer", fontSize: "13px" }}
            >
              ← Prev
            </button>
            <span style={{ padding: "6px 14px", fontSize: "13px", color: "#374151" }}>
              Page {filters.page} of {pagination.totalPages}
            </span>
            <button
              disabled={filters.page >= pagination.totalPages}
              onClick={() => setFilters(p => ({ ...p, page: p.page + 1 }))}
              style={{ padding: "6px 14px", borderRadius: "6px", border: "1px solid #d1d5db", background: "white", cursor: "pointer", fontSize: "13px" }}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Clear Logs Modal */}
      {showClearConfirm && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
          zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{ background: "white", borderRadius: "12px", padding: "28px", maxWidth: "400px", width: "100%" }}>
            <h3 style={{ margin: "0 0 12px", color: "#111827" }}>Clear Old Logs</h3>
            <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "16px" }}>
              This will permanently delete all logs older than the selected number of days.
            </p>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#374151", display: "block", marginBottom: "6px" }}>
                Delete logs older than:
              </label>
              <select
                value={clearDays}
                onChange={e => setClearDays(Number(e.target.value))}
                style={{ ...selectStyle, width: "100%" }}
              >
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
                <option value={180}>180 days</option>
                <option value={365}>1 year</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowClearConfirm(false)}
                style={{ padding: "9px 20px", borderRadius: "8px", border: "1px solid #d1d5db", background: "white", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={handleClear}
                style={{ padding: "9px 20px", borderRadius: "8px", border: "none", background: "#dc2626", color: "white", cursor: "pointer", fontWeight: "600" }}
              >
                Delete Logs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{
      background: "white", border: "1px solid #e5e7eb", borderRadius: "10px",
      padding: "16px 20px"
    }}>
      <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "6px", fontWeight: "600", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontSize: "26px", fontWeight: "800", color }}>
        {value?.toLocaleString() || 0}
      </div>
    </div>
  );
}
