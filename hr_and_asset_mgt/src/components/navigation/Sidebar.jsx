import { Nav, Button } from "react-bootstrap";
import { useNavigate, useLocation } from "react-router-dom";
import SvgView from "../svgIcon/svgView.jsx";
import { useState, useMemo } from "react";
import { useRole } from "../../contexts/RoleContext.jsx";
import ibillLogo from "../../assets/images/ibill-hrm-logo.jpeg";

// All navigation items with their access roles
const allNavItems = [
  { path: "/app/dashboard", icon: "dashboard", label: "Dashboard", permission: "VIEW_DASHBOARD" },
  { path: "/app/employees", icon: "users", label: "Employees", permission: "MANAGE_EMPLOYEES" },
  { path: "/app/probation", icon: "clock (1)", label: "Probation", permission: "MANAGE_EMPLOYEES" },
  { path: "/app/onboarding", icon: "clipboard-list", label: "Onboarding", permission: "MANAGE_ONBOARDING" }, // New Onboarding
  { path: "/app/offboarding", icon: "briefcase", label: "Offboarding", permission: "MANAGE_OFFBOARDING" }, // New Offboarding
  { path: "/app/payroll", icon: "dollar", label: "Payroll", permission: "MANAGE_PAYROLL" },
  { path: "/app/attendance", icon: "clock (1)", label: "Attendance", permission: "VIEW_DASHBOARD" }, // Assuming linked to employee mgmt
  { path: "/app/documents", icon: "document (1)", label: "Documents", permission: "VIEW_DASHBOARD" }, // Changed from MANAGE_DOCUMENTS so everyone can see their own docs
  { path: "/app/policies", icon: "document", label: "Policies", permission: "VIEW_DASHBOARD" },
  { path: "/app/announcements", icon: "notification", label: "Announcements", permission: "VIEW_DASHBOARD" },
  { path: "/app/appraisals", icon: "graph-arrow-increase", label: "Appraisals", permission: "MANAGE_APPRAISALS" },
  { path: "/app/assets", icon: "cube", label: "Assets", permission: "MANAGE_ASSETS" },
  { path: "/app/requests", icon: "document", label: "My Requests", permission: "VIEW_DASHBOARD" }, // Basic access
  { path: "/app/reports", icon: "reports", label: "Reports", permission: "VIEW_REPORTS" },
  { path: "/app/masters", icon: "settings", label: "Masters", permission: "MANAGE_MASTERS" },
];

export default function Sidebar({ isMobileOpen, setMobileOpen }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { role, hasPermission } = useRole();

  // Filter navigation items based on user role
  const navItems = useMemo(() => {
    return allNavItems.filter((item) => hasPermission(item.permission));
  }, [role, hasPermission]);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleNavClick = (path) => {
    navigate(path);
    if (window.innerWidth < 768) {
      setMobileOpen(false);
    }
  };

  return (
    <div className={`sidebar ${isCollapsed ? "collapsed" : ""} ${isMobileOpen ? "mobile-open" : ""}`}>
      {/* Brand Header */}
      <div className="sidebar-brand">
        {isCollapsed ? (
          <button
            className="icon-btn collapse-arrow-btn"
            onClick={toggleCollapse}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}
            title="Expand sidebar"
          >
            <img src={ibillLogo} alt="iBill HRM" style={{ width: "34px", height: "34px", objectFit: "contain", borderRadius: "6px" }} />
          </button>
        ) : (
          <>
            {/* iBill HRM Logo */}
            <div className="sidebar-brand-logo" style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
              <img
                src={ibillLogo}
                alt="iBill HRM"
                style={{ height: "42px", width: "auto", objectFit: "contain", flexShrink: 0 }}
              />
            </div>

            <Button
              variant="light"
              className="icon-btn back-btn d-none d-md-flex"
              onClick={toggleCollapse}
            >
              <SvgView name="arrow-left" size={15} />
            </Button>
            {/* Mobile-only close button */}
            <Button
              variant="light"
              className="icon-btn back-btn d-flex d-md-none"
              onClick={() => setMobileOpen(false)}
            >
              <SvgView name="close" size={15} />
            </Button>
          </>
        )}
      </div>

      {/* Navigation */}
      <Nav className="flex-column sidebar-nav">
        {navItems.map((item) => (
          <Nav.Link
            key={item.path}
            onClick={() => handleNavClick(item.path)}
            active={location.pathname === item.path}
            className={`sidebar-link ${location.pathname === item.path ? "active" : ""
              }`}
          >
            <SvgView name={item.icon} size={20} />
            <span className="nav-label">{item.label}</span>
          </Nav.Link>
        ))}
      </Nav>
    </div>
  );
}
