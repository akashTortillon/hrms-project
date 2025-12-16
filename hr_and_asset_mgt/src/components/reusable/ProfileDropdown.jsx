import { useEffect, useRef } from "react";
import "../../style/Profile.css";

export default function ProfileDropdown({
  isOpen,
  onClose,
  onProfile,
  onSettings,
  onLogout,
  anchorRef,
}) {
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      const menuEl = menuRef.current;
      const anchorEl = anchorRef?.current;
      if (
        isOpen &&
        menuEl &&
        !menuEl.contains(e.target) &&
        (!anchorEl || !anchorEl.contains(e.target))
      ) {
        onClose?.();
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen) return null;

  return (
    <div className="profile-dropdown" ref={menuRef}>
      <div className="profile-dropdown__section">
        <div className="profile-dropdown__label">Switch Role (Demo)</div>
        <select className="profile-dropdown__select" defaultValue="Admin">
          <option value="Admin">Admin</option>
          <option value="Manager">Manager</option>
          <option value="Employee">Employee</option>
        </select>
      </div>

      <div className="profile-dropdown__menu">
        <button
          className="profile-dropdown__item"
          type="button"
          onClick={() => onProfile?.()}
        >
          My Profile
        </button>
        <button
          className="profile-dropdown__item"
          type="button"
          onClick={() => onSettings?.()}
        >
          Settings
        </button>
        <div className="profile-dropdown__divider" />
        <button
          className="profile-dropdown__item profile-dropdown__item--danger"
          type="button"
          onClick={() => onLogout?.()}
        >
          Logout
        </button>
      </div>
    </div>
  );
}

