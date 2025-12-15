import { useState, useRef, useEffect } from "react";
import { Card } from "react-bootstrap";
import "../../style/layout.css";

export default function QuickActionMenu({
  items = [],
  onSelect,
  icon = "+",
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

  const handleItemClick = (item) => {
    setOpen(false);
    onSelect?.(item);
  };

  const handleToggle = () => {
    setOpen((prev) => !prev);
  };

  return (
    <div className="quick-action-wrapper" ref={menuRef}>
      <button
        className="icon-btn quick-action-btn"
        onClick={handleToggle}
        aria-label="Quick Actions"
      >
        {children || icon}
      </button>

      {open && (
        <Card className="quick-action-menu">
          <Card.Body style={{ padding: 0 }}>
            {items.map((item, index) => (
              <div
                key={index}
                className="quick-action-item"
                onClick={() => handleItemClick(item)}
              >
                {item.label}
              </div>
            ))}
          </Card.Body>
        </Card>
      )}
    </div>
  );
}
