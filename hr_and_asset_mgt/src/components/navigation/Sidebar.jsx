import { Nav,Button } from "react-bootstrap";
import SvgView from "../svgIcon/svgView.jsx";
import "../../style/layout.css";

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
  return (
    <div className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">HR</div>
        <div>
          <div className="brand-title">HRMS Pro</div>
          <div className="brand-subtitle">UAE Edition</div>
        </div>
        <Button
            variant="light"
            className="icon-btn back-btn"
            aria-label="Back"
          >
            <span className="arrow-left" />
          </Button>
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
            className="sidebar-link"
          >
            <SvgView name={item.icon} size={20} />
            <span>{item.label}</span>
          </Nav.Link>
        ))}
      </Nav>
    </div>
  );
}

