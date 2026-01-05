import { useState, useRef, useEffect } from "react";
import { Card } from "react-bootstrap";
import "../../style/layout.css";

export default function NotificationDropdown({
  title = "Notifications",
  badgeCount,
  items = [],
  footerAction,
  children,
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleToggle = () => {
    setOpen((prev) => !prev);
  };

  return (
    <div className="notification-dropdown-wrapper" ref={menuRef}>
      <button
        className="icon-btn notification-btn"
        onClick={handleToggle}
        aria-label="Notifications"
      >
        {children}
        <span className="notification-dot" />
      </button>

      {open && (
        <Card className="notification-dropdown-menu">
          <Card.Body style={{ padding: 0 }}>
            <div className="notification-header">
              <div className="notification-title">{title}</div>
              {badgeCount && (
                <span className="notification-badge">{badgeCount} new</span>
              )}
            </div>
            <div className="notification-items">
              {items.map((item, index) => (
                <div key={index} className="notification-item">
                  <div className="notification-item-title">{item.title}</div>
                  <div className="notification-item-time">{item.time}</div>
                </div>
              ))}
            </div>
            {footerAction && (
              <div
                className="notification-footer"
                onClick={() => {
                  setOpen(false);
                  footerAction.onClick?.();
                }}
              >
                {footerAction.label}
              </div>
            )}
          </Card.Body>
        </Card>
      )}
    </div>
  );
}



