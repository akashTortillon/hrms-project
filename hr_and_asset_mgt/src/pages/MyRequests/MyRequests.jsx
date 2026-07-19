import { useState } from "react";
import { useRole } from "../../contexts/RoleContext.jsx";
import EmployeeRequests from "./EmployeeRequests.jsx";
import AdminRequests from "./AdminRequests.jsx";

// Self icon
const SelfIcon = ({ active }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke={active ? "#2563eb" : "#9ca3af"} strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

// Manager icon
const ManagerIcon = ({ active }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke={active ? "#2563eb" : "#9ca3af"} strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export default function MyRequests() {
  const { hasPermission } = useRole();

  const isApprover =
    hasPermission("APPROVE_REQUESTS") ||
    hasPermission("APPROVE_MANAGER_REQUESTS") ||
    hasPermission("APPROVE_FINANCE_REQUESTS");

  const user = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  })();
  const hasEmployeeProfile = Boolean(user?.employeeId);

  // Default: if approver, start on Manager view; if pure employee, irrelevant
  const [activeView, setActiveView] = useState("manager");

  // Pure employee — only see their own requests
  if (!isApprover) {
    return <EmployeeRequests />;
  }

  // Approver with no employee profile — only manager/admin view
  if (!hasEmployeeProfile) {
    return <AdminRequests />;
  }

  // Approver who is also an employee — show Self | Manager tabs
  return (
    <div>
      {/* Self | Manager tab bar — styled like the reference image */}
      <div style={{
        display: "flex",
        borderBottom: "2px solid #e5e7eb",
        marginBottom: "28px",
        gap: "0",
        width: "fit-content"
      }}>
        {/* Self tab */}
        <button
          onClick={() => setActiveView("self")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            padding: "10px 24px 12px",
            border: "none",
            background: "transparent",
            fontSize: "15px",
            fontWeight: activeView === "self" ? "700" : "500",
            color: activeView === "self" ? "#2563eb" : "#6b7280",
            cursor: "pointer",
            borderBottom: activeView === "self" ? "2px solid #2563eb" : "2px solid transparent",
            marginBottom: "-2px",
            transition: "all 0.15s",
            letterSpacing: "0.01em"
          }}
        >
          <SelfIcon active={activeView === "self"} />
          Self
        </button>

        {/* Manager tab */}
        <button
          onClick={() => setActiveView("manager")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            padding: "10px 24px 12px",
            border: "none",
            background: "transparent",
            fontSize: "15px",
            fontWeight: activeView === "manager" ? "700" : "500",
            color: activeView === "manager" ? "#2563eb" : "#6b7280",
            cursor: "pointer",
            borderBottom: activeView === "manager" ? "2px solid #2563eb" : "2px solid transparent",
            marginBottom: "-2px",
            transition: "all 0.15s",
            letterSpacing: "0.01em"
          }}
        >
          <ManagerIcon active={activeView === "manager"} />
          Manager
        </button>
      </div>

      {activeView === "self" ? <EmployeeRequests /> : <AdminRequests />}
    </div>
  );
}
