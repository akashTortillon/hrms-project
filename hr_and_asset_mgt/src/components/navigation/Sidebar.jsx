import { Nav, Button } from "react-bootstrap";
import { useNavigate, useLocation } from "react-router-dom";
import SvgView from "../svgIcon/svgView.jsx";
import SvgIcon from "../svgIcon/svgView.jsx";
import { useState, useMemo } from "react";
import { useRole } from "../../contexts/RoleContext.jsx";

// All navigation items with their access roles
const allNavItems = [
  { path: "/app/dashboard", icon: "dashboard", label: "Dashboard", roles: ["Admin", "Manager", "Employee"] },
  { path: "/app/employees", icon: "users", label: "Employees", roles: ["Admin", "Manager"] },
  { path: "/app/payroll", icon: "dollar", label: "Payroll", roles: ["Admin", "Manager"] },
  { path: "/app/attendance", icon: "clock (1)", label: "Attendance", roles: ["Admin", "Manager"] },
  { path: "/app/documents", icon: "document (1)", label: "Documents", roles: ["Admin", "Manager", "Employee"] },
  { path: "/app/assets", icon: "cube", label: "Assets", roles: ["Admin", "Manager"] },
  { path: "/app/requests", icon: "document", label: "My Requests", roles: ["Admin", "Manager", "Employee"] },
  { path: "/app/reports", icon: "reports", label: "Reports", roles: ["Admin", "Manager"] },
  { path: "/app/masters", icon: "settings", label: "Masters", roles: ["Admin"] },
];

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { role } = useRole();

  // Filter navigation items based on user role
  const navItems = useMemo(() => {
    return allNavItems.filter((item) => item.roles.includes(role));
  }, [role]);

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
            <SvgIcon name="arrow-right" size={20} />
          </Button>
        ) : (
          <>
            <div className="brand-icon">HR</div>
            <div className="brand-text-wrapper">
              <div className="brand-title">HRMS Pro</div>
              <div className="brand-subtitle">UAE Edition</div>
            </div>
            <Button
              variant="light"
              className="icon-btn back-btn"
              onClick={toggleCollapse}
            >
              <SvgIcon name="arrow-left" size={15} />
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
            className={`sidebar-link ${
              location.pathname === item.path ? "active" : ""
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
