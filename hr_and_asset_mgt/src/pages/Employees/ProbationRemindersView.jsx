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

export default function ProbationRemindersView() {
  const navigate = useNavigate();
  const { hasPermission } = useRole();
  const canManageEmployees = hasPermission("MANAGE_EMPLOYEES");
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [submitting, setSubmitting] = useState(false);

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

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      <div>
        <h2 style={{ marginBottom: "6px" }}>Probation Reminders</h2>
        <p style={{ color: "#6b7280" }}>
          Employees whose probation is due within the next 7 days or waiting for confirmation.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gap: "14px",
          padding: "18px",
          borderRadius: "18px",
          border: "1px solid #ece6d8",
          background: "radial-gradient(circle at top right, rgba(212, 178, 74, 0.08), transparent 30%), #fff",
          boxShadow: "0 18px 40px rgba(15, 23, 42, 0.05)"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ fontWeight: 700, color: "#1f2937" }}>Pending confirmations</div>
          <div style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#9a7a2f" }}>
            {employees.length} employees
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "26px 12px", textAlign: "center", color: "#64748b" }}>Loading probation reminders...</div>
        ) : employees.length ? (
          <div style={{ display: "grid", gap: "12px" }}>
            {employees.map((employee) => (
              <div
                key={employee._id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1.3fr) repeat(3, minmax(120px, 0.8fr)) auto",
                  gap: "14px",
                  alignItems: "center",
                  padding: "16px",
                  borderRadius: "16px",
                  border: "1px solid #ede7d8",
                  background: "linear-gradient(180deg, #ffffff 0%, #fbf8f2 100%)"
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
            No probation reminders are due right now.
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
