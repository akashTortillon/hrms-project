import { useState } from "react";
import { Nav,Button } from "react-bootstrap";
import SvgView from "../svgIcon/svgView.jsx";
import "../../style/layout.css";
import SvgIcon from "../svgIcon/svgView.jsx";

const navItems = [
  { key: "Dashboard", icon: "dashboard", label: "Dashboard" },
  { key: "Employees", icon: "users", label: "Employees" },
  { key: "Payroll", icon: "dollar", label: "Payroll" },
  { key: "Attendance", icon: "clock (1)", label: "Attendance" },
  { key: "Documents", icon: "document (1)", label: "Documents" },
  { key: "Assets", icon: "cube", label: "Assets" },
  { key: "My Requests", icon: "document", label: "My Requests" },
  { key: "Reports", icon: "reports", label: "Reports" },
  { key: "Masters", icon: "settings", label: "Masters" },
];

export default function Sidebar({ activeKey, onSelect }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
      <div className="sidebar-brand">
        {isCollapsed ? (
          <Button
            variant="light"
            className="icon-btn collapse-arrow-btn"
            aria-label="Expand"
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
              aria-label="Collapse"
              onClick={toggleCollapse}
            >
              <SvgIcon name="arrow-left" size={15} />
            </Button>
          </>
        )}
      </div>
      <Nav
        className="flex-column sidebar-nav"
        activeKey={activeKey}
        onSelect={onSelect}
      >
        {navItems.map((item) => (
          <Nav.Link
            key={item.key}
            eventKey={item.key}
            className={`sidebar-link ${activeKey === item.key ? "active" : ""}`}
          >
            <SvgView name={item.icon} size={20} />
            <span className="nav-label">{item.label}</span>
          </Nav.Link>
        ))}
      </Nav>
    </div>
  );
}

