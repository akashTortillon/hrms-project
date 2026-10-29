import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { confirmProbation, getProbationReminders } from "../../services/employeeService";
import ConfirmProbationModal from "./ConfirmProbationModal.jsx";
import { useRole } from "../../contexts/RoleContext.jsx";

const formatDate = (value) => {
  if (!value) return "N/A";
  return new Date(value).toISOString().split("T")[0];
};

// Day chips narrow the list by days left until probation ends; numeric chips include
// overdue employees too (they are the most urgent), "overdue" shows only those.
const FILTERS = [
  { key: "all", label: "All" },
  { key: "overdue", label: "Overdue" },
  { key: "7", label: "7 days" },
  { key: "15", label: "15 days" },
  { key: "30", label: "30 days" },
  { key: "60", label: "60 days" },
  { key: "90", label: "90 days" }
];

const matchesFilter = (employee, key) => {
  if (key === "all") return true;
  if (key === "overdue") return employee.daysRemaining < 0;
  return employee.daysRemaining <= Number(key);
};

const daysLabel = (employee) => {
  const days = employee.daysRemaining;
  if (days < 0) return `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`;
  if (days === 0) return "Ends today";
  return `${days} day${days === 1 ? "" : "s"} left`;
};

export default function ProbationRemindersView() {
  const navigate = useNavigate();
  const { hasPermission } = useRole();
  const canManageEmployees = hasPermission("MANAGE_EMPLOYEES");
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState("all");

  const loadReminders = async () => {
    try {
      setLoading(true);
      const response = await getProbationReminders();
      setEmployees(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      toast.error("Failed to load probation reminders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReminders();
  }, []);

  const handleConfirm = async (payload) => {
    if (!selectedEmployee?._id) return;

    try {
      setSubmitting(true);
      await confirmProbation(selectedEmployee._id, payload);
      toast.success("Probation confirmed successfully");
      setSelectedEmployee(null);
      await loadReminders();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to confirm probation");
    } finally {
      setSubmitting(false);
    }
  };

  const visibleEmployees = employees.filter((employee) => matchesFilter(employee, filter));

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      <div>
        <h2 style={{ marginBottom: "6px" }}>Probation Reminders</h2>
        <p style={{ color: "#6b7280" }}>
          Employees on probation who are not confirmed yet. Use the day filters to see who is due soon.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gap: "14px",
          padding: "18px",
          borderRadius: "18px",
          border: "1px solid #dbe7fa",
          background: "radial-gradient(circle at top right, rgba(28, 79, 158, 0.08), transparent 30%), #fff",
          boxShadow: "0 18px 40px rgba(15, 23, 42, 0.05)"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ fontWeight: 700, color: "#1f2937" }}>Pending confirmations</div>
          <div style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#3562a6" }}>
            {visibleEmployees.length} of {employees.length} employees
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {FILTERS.map(({ key, label }) => {
            const active = filter === key;
            const count = employees.filter((employee) => matchesFilter(employee, key)).length;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "999px",
                  border: `1px solid ${active ? "#1c4f9e" : "#dbe7fa"}`,
                  background: active ? "#1c4f9e" : "#fff",
                  color: active ? "#fff" : "#1f2937",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>

        {loading ? (
          <div style={{ padding: "26px 12px", textAlign: "center", color: "#64748b" }}>Loading probation reminders...</div>
        ) : visibleEmployees.length ? (
          <div style={{ display: "grid", gap: "12px" }}>
            {visibleEmployees.map((employee) => (
              <div
                key={employee._id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1.3fr) repeat(3, minmax(120px, 0.8fr)) auto",
                  gap: "14px",
                  alignItems: "center",
                  padding: "16px",
                  borderRadius: "16px",
                  border: "1px solid #dbe7fa",
                  background: "linear-gradient(180deg, #ffffff 0%, #eef4fc 100%)"
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: "#1f2937" }}>{employee.name}</div>
                  <div style={{ marginTop: "4px", fontSize: "13px", color: "#64748b" }}>
                    {employee.code} • {employee.designation || employee.role || "Employee"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#97a0af" }}>
                    End Date
                  </div>
                  <div style={{ marginTop: "6px", fontWeight: 600, color: "#1f2937" }}>{formatDate(employee.probationEndDate)}</div>
                  <div style={{ marginTop: "2px", fontSize: "12px", fontWeight: 700, color: employee.overdue ? "#dc2626" : employee.dueSoon ? "#d97706" : "#64748b" }}>
                    {daysLabel(employee)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#97a0af" }}>
                    Status
                  </div>
                  <div style={{ marginTop: "6px", fontWeight: 600, color: "#1f2937" }}>
                    {(employee.probationStatus || "N/A").replace(/_/g, " ")}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#97a0af" }}>
                    Increment
                  </div>
                  <div style={{ marginTop: "6px", fontWeight: 600, color: "#1f2937" }}>
                    {Number(employee.fixedProbationIncrementAmount || 0).toLocaleString("en-AE")} AED
                  </div>
                </div>
                <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => navigate(`/app/employees/${employee._id}`)}
                    style={{ minWidth: "unset" }}
                  >
                    View Profile
                  </button>
                  {canManageEmployees && (
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => setSelectedEmployee(employee)}
                      style={{ minWidth: "unset" }}
                    >
                      Confirm Probation
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              padding: "30px",
              textAlign: "center",
              color: "#64748b",
              background: "#fafbfc",
              borderRadius: "14px",
              border: "1px dashed #d8dee8"
            }}
          >
            {employees.length ? "No employees match this filter." : "No employees are on probation right now."}
          </div>
        )}
      </div>

      {selectedEmployee && (
        <ConfirmProbationModal
          employee={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
          onConfirm={handleConfirm}
          submitting={submitting}
        />
      )}
    </div>
  );
}
