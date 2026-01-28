import { useState, useRef, useEffect } from "react";
import { Card } from "react-bootstrap";
import "../../style/layout.css";

export default function NotificationDropdown({
  title = "Notifications",
  badgeCount,
  items = [],
  onItemClick,
  onMarkAllRead,
  onDeleteItem,
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
      </button>

      {open && (
        <Card className="notification-dropdown-menu">
          <Card.Body style={{ padding: 0 }}>
            <div className="notification-header">
              <div className="notification-title-group">
                <span className="notification-title">{title}</span>
                {/* {items.length > 0 && onMarkAllRead && (
                  <button className="mark-read-btn" onClick={onMarkAllRead}>
                    Mark all as read
                  </button>
                )} */}
              </div>
              {badgeCount > 0 && (
                <span className="notification-badge">{badgeCount} new</span>
              )}
            </div>
            <div className="notification-items">
              {items.length === 0 ? (
                <div className="notification-empty">
                  No new notifications
                </div>
              ) : (
                items.map((item, index) => (
                  <div
                    key={item._id || index}
                    className={`notification-item ${!item.isRead ? 'unread' : ''}`}
                    onClick={() => {
                      onItemClick?.(item);
                      setOpen(false);
                    }}
                  >
                    <div className="notification-item-content">
                      <div className="notification-item-title">
                        {item.title}
                      </div>
                      <div className="notification-item-time">{item.time}</div>
                    </div>
                    <div className="notification-item-actions">
                      {!item.isRead && <span className="unread-dot" />}
                      <button
                        className="delete-item-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteItem?.(item._id);
                        }}
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card.Body>
        </Card>
      )}
    </div>
  );
}





