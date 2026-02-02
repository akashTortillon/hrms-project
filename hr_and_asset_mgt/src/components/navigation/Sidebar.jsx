import { Nav, Button } from "react-bootstrap";
import { useNavigate, useLocation } from "react-router-dom";
import SvgView from "../svgIcon/svgView.jsx";
import { useState, useMemo } from "react";
import { useRole } from "../../contexts/RoleContext.jsx";
import leptisLogo from "../../assets/images/logo-leptis.png"

// All navigation items with their access roles
const allNavItems = [
  { path: "/app/dashboard", icon: "dashboard", label: "Dashboard", permission: "VIEW_DASHBOARD" },
  { path: "/app/employees", icon: "users", label: "Employees", permission: "MANAGE_EMPLOYEES" },
  { path: "/app/payroll", icon: "dollar", label: "Payroll", permission: "MANAGE_PAYROLL" },
  { path: "/app/attendance", icon: "clock (1)", label: "Attendance", permission: "VIEW_DASHBOARD" }, // Assuming linked to employee mgmt
  { path: "/app/documents", icon: "document (1)", label: "Documents", permission: "VIEW_DASHBOARD" }, // Changed from MANAGE_DOCUMENTS so everyone can see their own docs
  { path: "/app/assets", icon: "cube", label: "Assets", permission: "MANAGE_ASSETS" },
  { path: "/app/requests", icon: "document", label: "My Requests", permission: "VIEW_DASHBOARD" }, // Basic access
  { path: "/app/reports", icon: "reports", label: "Reports", permission: "VIEW_REPORTS" },
  { path: "/app/masters", icon: "settings", label: "Masters", permission: "MANAGE_MASTERS" },
];

export default function Sidebar() {
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

  return (
    <div className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
      {/* Brand Header */}
      <div className="sidebar-brand">
        {isCollapsed ? (
          <Button
            variant="light"
            className="icon-btn collapse-arrow-btn"
            onClick={toggleCollapse}
          >
            <SvgView name="arrow-right" size={20} />
          </Button>
        ) : (
          <>
            <div className="brand-icon"><img src={leptisLogo} alt="Leptis Logo" /></div>
            <div className="brand-text-wrapper">
              <div className="brand-title" style={{color:"white"}}>LEPTIS</div>
              <div className="brand-subtitle" style={{color:"red"}}>ENTERPRISE</div>
            </div>
            <Button
              variant="light"
              className="icon-btn back-btn"
              onClick={toggleCollapse}
            >
              <SvgView name="arrow-left" size={15} />
            </Button>
          </>
        )}
      </div>

      {/* Navigation */}
      <Nav className="flex-column sidebar-nav">
        {navItems.map((item) => (
          <Nav.Link
            key={item.path}
            onClick={() => navigate(item.path)}
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
