import { Nav, Button } from "react-bootstrap";
import { useNavigate, useLocation } from "react-router-dom";
import SvgView from "../svgIcon/svgView.jsx";
import { useState, useMemo } from "react";
import { useRole } from "../../contexts/RoleContext.jsx";
import leptisLogo from "../../assets/svg/leptis_logo.svg";
import leptisIcon from "../../assets/images/logo-leptis.png";

// All navigation items with their access roles
const allNavItems = [
  { path: "/app/dashboard", icon: "dashboard", label: "Dashboard", permission: "VIEW_DASHBOARD" },
  // VIEW_ALL_EMPLOYEES (not MANAGE_EMPLOYEES) - the default "Manager" role only has
  // VIEW_ALL_EMPLOYEES (see config/db.js), and getEmployees() itself already scopes
  // the list to a Manager's own direct reports. Gating the nav link on MANAGE_EMPLOYEES
  // left Managers with no click-path to any report's page at all, even though the
  // list endpoint behind it was already correctly scoped for them.
  { path: "/app/employees", icon: "users", label: "Employees", permission: "VIEW_ALL_EMPLOYEES" },
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
  { path: "/app/activity-log", icon: "document (1)", label: "Activity Log", permission: "MANAGE_MASTERS" },
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
            <img src={leptisIcon} alt="Leptis" width="34" height="34" style={{ borderRadius: "8px" }} />
          </button>
        ) : (
          <>
            {/* Leptis HRM Logo */}
            <div className="sidebar-brand-logo" style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
              <img src={leptisLogo} alt="Leptis" style={{ height: "28px", width: "auto", flexShrink: 0 }} />
              <span style={{
                fontSize: "10px",
                fontWeight: 600,
                letterSpacing: "3px",
                color: "#4c7fd6",
                textTransform: "uppercase"
              }}>
                HRM
              </span>
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
