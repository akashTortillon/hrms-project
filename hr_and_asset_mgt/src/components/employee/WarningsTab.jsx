import { useState, useEffect, useRef } from "react";
import { getEmployeeWarnings, addWarning, updateWarningStatus, deleteWarning } from "../../services/warningService.js";
import { toast } from "react-toastify";
import { useRole } from "../../contexts/RoleContext.jsx";

const SEVERITY_COLORS = {
  Low: { bg: "#f0fdf4", color: "#166534", border: "#bbf7d0" },
  Medium: { bg: "#fef3c7", color: "#92400e", border: "#fde68a" },
  High: { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
  Critical: { bg: "#fef2f2", color: "#991b1b", border: "#fecaca" },
};

const STATUS_COLORS = {
  Active: { bg: "#fef2f2", color: "#991b1b" },
  Acknowledged: { bg: "#eff6ff", color: "#1d4ed8" },
  Resolved: { bg: "#f0fdf4", color: "#166534" },
  Appealed: { bg: "#faf5ff", color: "#7e22ce" },
};

const WARNING_TYPES = [
  "Warning",
  "Written Warning",
  "Suspension",
  "Termination Notice",
  "Performance Improvement",
  "Other",
];

export default function WarningsTab({ employeeId, isSelf = false }) {
  const { hasPermission } = useRole();
  const fileRef = useRef(null);

  const canManage =
    hasPermission("ALL") ||
    hasPermission("MANAGE_EMPLOYEES") ||
    hasPermission("APPROVE_REQUESTS");

  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    warningType: "Warning",
    severity: "Medium",
    subject: "",
    description: "",
    issuedDate: new Date().toISOString().split("T")[0],
  });
  const [attachmentFile, setAttachmentFile] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getEmployeeWarnings(employeeId);
      setWarnings(res.data || []);
    } catch {
      toast.error("Failed to load warnings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (employeeId) load();
  }, [employeeId]);

  const handleSubmit = async () => {
    if (!form.subject.trim() || !form.description.trim()) {
      toast.error("Subject and description are required");
      return;
    }
    setSaving(true);
    try {
      let payload;
      if (attachmentFile) {
        payload = new FormData();
        payload.append("employeeId", employeeId);
        Object.entries(form).forEach(([k, v]) => payload.append(k, v));
        payload.append("attachment", attachmentFile);
      } else {
        payload = { ...form, employeeId };
      }
      await addWarning(payload);
      toast.success("Warning issued successfully");
      setShowForm(false);
      setForm({ warningType: "Warning", severity: "Medium", subject: "", description: "", issuedDate: new Date().toISOString().split("T")[0] });
      setAttachmentFile(null);
      if (fileRef.current) fileRef.current.value = "";
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to issue warning");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updateWarningStatus(id, { status });
      toast.success(`Warning marked as ${status}`);
      load();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this warning? This cannot be undone.")) return;
    try {
      await deleteWarning(id);
      toast.success("Warning deleted");
      load();
    } catch {
      toast.error("Failed to delete warning");
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "9px 12px",
    borderRadius: "8px",
    border: "1px solid #d1d5db",
    fontSize: "14px",
    boxSizing: "border-box",
  };

  const labelStyle = {
    display: "block",
    fontSize: "13px",
    fontWeight: "600",
    color: "#374151",
    marginBottom: "5px",
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h3 style={{ margin: 0, fontSize: "18px", color: "#1f2937" }}>
          Warnings & Disciplinary Actions
        </h3>
        {canManage && !isSelf && (
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              background: showForm ? "#f3f4f6" : "#dc2626",
              color: showForm ? "#374151" : "white",
              border: "none",
              padding: "8px 18px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            {showForm ? "Cancel" : "+ Issue Warning"}
          </button>
        )}
      </div>

      {/* Add Warning Form */}
      {showForm && canManage && (
        <div style={{
          background: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "24px",
        }}>
          <div style={{ fontSize: "15px", fontWeight: "700", color: "#991b1b", marginBottom: "16px" }}>
            Issue Warning / Disciplinary Action
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div>
              <label style={labelStyle}>Warning Type *</label>
              <select
                value={form.warningType}
                onChange={(e) => setForm({ ...form, warningType: e.target.value })}
                style={inputStyle}
              >
                {WARNING_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Severity *</label>
              <select
                value={form.severity}
                onChange={(e) => setForm({ ...form, severity: e.target.value })}
                style={inputStyle}
              >
                {["Low", "Medium", "High", "Critical"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div style={{ gridColumn: "span 2" }}>
              <label style={labelStyle}>Subject *</label>
              <input
                type="text"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Brief subject of the warning"
                style={inputStyle}
              />
            </div>

            <div style={{ gridColumn: "span 2" }}>
              <label style={labelStyle}>Description / Details *</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe the incident or reason for this warning in detail..."
                rows={4}
                style={{ ...inputStyle, height: "auto", resize: "vertical" }}
              />
            </div>

            <div>
              <label style={labelStyle}>Issue Date</label>
              <input
                type="date"
                value={form.issuedDate}
                onChange={(e) => setForm({ ...form, issuedDate: e.target.value })}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Attach Document (optional)</label>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(e) => setAttachmentFile(e.target.files[0] || null)}
                style={{ fontSize: "13px", marginTop: "4px" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "16px" }}>
            <button
              onClick={() => { setShowForm(false); setAttachmentFile(null); }}
              style={{ padding: "9px 20px", borderRadius: "8px", border: "1px solid #d1d5db", background: "white", fontSize: "14px", cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              style={{
                padding: "9px 20px", borderRadius: "8px", border: "none",
                background: saving ? "#fca5a5" : "#dc2626", color: "white",
                fontSize: "14px", fontWeight: "600", cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Issuing..." : "Issue Warning"}
            </button>
          </div>
        </div>
      )}

      {/* Warnings List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "30px", color: "#6b7280" }}>Loading warnings...</div>
      ) : warnings.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#6b7280", background: "#f9fafb", borderRadius: "10px" }}>
          <div style={{ fontSize: "16px", fontWeight: "600", marginBottom: "6px" }}>No warnings on record</div>
          <div style={{ fontSize: "13px" }}>This employee has no disciplinary actions recorded.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {warnings.map((w) => {
            const sev = SEVERITY_COLORS[w.severity] || SEVERITY_COLORS.Medium;
            const stat = STATUS_COLORS[w.status] || STATUS_COLORS.Active;

            return (
              <div key={w._id} style={{
                background: "white",
                border: "1px solid #e5e7eb",
                borderLeft: `4px solid ${sev.border}`,
                borderRadius: "10px",
                padding: "18px 20px",
              }}>
                {/* Top row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
                  <div>
                    <div style={{ fontWeight: "700", fontSize: "15px", color: "#111827" }}>{w.subject}</div>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "3px" }}>
                      {w.warningType} • Issued by {w.issuedBy?.name || "HR"} • {new Date(w.issuedDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "11px", fontWeight: "700", padding: "3px 10px", borderRadius: "9999px", background: sev.bg, color: sev.color, border: `1px solid ${sev.border}` }}>
                      {w.severity}
                    </span>
                    <span style={{ fontSize: "11px", fontWeight: "700", padding: "3px 10px", borderRadius: "9999px", background: stat.bg, color: stat.color }}>
                      {w.status}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p style={{ fontSize: "13px", color: "#374151", margin: "0 0 12px 0", lineHeight: "1.6" }}>
                  {w.description}
                </p>

                {/* Attachment */}
                {w.attachmentUrl && (
                  <a
                    href={w.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: "13px", color: "#2563eb", display: "inline-flex", alignItems: "center", gap: "4px", marginBottom: "12px" }}
                  >
                    📎 {w.attachmentName || "View Attachment"}
                  </a>
                )}

                {/* Actions */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {/* Employee can acknowledge */}
                  {isSelf && w.status === "Active" && (
                    <button
                      onClick={() => handleStatusChange(w._id, "Acknowledged")}
                      style={{ fontSize: "12px", padding: "5px 12px", borderRadius: "6px", border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1d4ed8", cursor: "pointer", fontWeight: "600" }}
                    >
                      Acknowledge
                    </button>
                  )}

                  {/* Manager/HR can resolve */}
                  {canManage && !isSelf && w.status !== "Resolved" && (
                    <button
                      onClick={() => handleStatusChange(w._id, "Resolved")}
                      style={{ fontSize: "12px", padding: "5px 12px", borderRadius: "6px", border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#166534", cursor: "pointer", fontWeight: "600" }}
                    >
                      Mark Resolved
                    </button>
                  )}

                  {/* Delete */}
                  {canManage && !isSelf && (
                    <button
                      onClick={() => handleDelete(w._id)}
                      style={{ fontSize: "12px", padding: "5px 12px", borderRadius: "6px", border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", cursor: "pointer", fontWeight: "600" }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
