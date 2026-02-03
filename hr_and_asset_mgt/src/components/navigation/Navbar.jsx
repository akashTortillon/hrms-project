import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Navbar,
  Container,
} from "react-bootstrap";
import GlobalSearch from "./GlobalSearch";

import SvgIcon from "../svgIcon/svgView.jsx";
import QuickActionMenu from "../reusable/QuickActionMenu";
import NotificationDropdown from "../reusable/NotificationDropdown";
import ProfileDropdown from "../reusable/ProfileDropdown";
import "../../style/Profile.css";
import { useRole } from "../../contexts/RoleContext.jsx";
import { logoutUser } from "../../api/authService";
import {
  fetchNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  dismissVirtualNotification
} from "../../services/notificationService";


const quickActions = [
  { label: "Add Employee", key: "addEmployee" },
  { label: "Add Asset", key: "addAsset" },
  { label: "Upload Document", key: "uploadDocument" },
];

export default function NavigationBar() {
  const [profileOpen, setProfileOpen] = useState(false);
  const { role, setRole, hasPermission } = useRole();
  const profileAnchorRef = useRef(null);
  const navigate = useNavigate();

  // Dynamic Notifications State
  const [notifications, setNotifications] = useState([]);
  const [badgeCount, setBadgeCount] = useState(0);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await fetchNotifications();
      const count = await getUnreadCount();

      // Format time for the reusable component
      const formatted = data.map(n => ({
        ...n,
        time: formatNotificationTime(n.createdAt)
      }));

      setNotifications(formatted);
      setBadgeCount(count);
    } catch (error) {
      console.error("Failed to load notifications", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      loadNotifications();
    } catch (error) {
      console.error("Failed to mark all as read", error);
    }
  };

  const handleDeleteNotification = async (id) => {
    // Optimistic Update: Remove from UI immediately
    setNotifications(prev => {
      const itemToDelete = prev.find(n => n._id === id);
      if (itemToDelete && (!itemToDelete.isRead || itemToDelete.isVirtual)) {
        setBadgeCount(c => Math.max(0, c - 1));
      }
      return prev.filter(n => n._id !== id);
    });

    try {
      if (id && String(id).startsWith("virtual-")) {
        await dismissVirtualNotification(id);
      } else {
        await deleteNotification(id);
      }
      // Refresh background data to stay in sync
      loadNotifications();
    } catch (error) {
      console.error("Failed to delete notification", error);
      // Revert on error
      loadNotifications();
    }
  };

  const handleNotificationClick = async (item) => {
    if (!item.isRead && !item.isVirtual) {
      await markNotificationAsRead(item._id);
      loadNotifications(); // Refresh
    }
    if (item.link) {
      navigate(item.link);
    }
  };

  const formatNotificationTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSecs = Math.floor((now - date) / 1000);

    if (diffInSecs < 60) return "Just now";
    if (diffInSecs < 3600) return `${Math.floor(diffInSecs / 60)}m ago`;
    if (diffInSecs < 86400) return `${Math.floor(diffInSecs / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error("Logout failed", error);
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userPermissions");
    // navigate("/login");
    window.location.href = "/login"; // Force full reload to clear all states
  };

  return (
    <Navbar className="topbar" bg="white" expand="lg">
      <Container fluid className="topbar-container">
        <div className="brand">


        </div>

        {role && <GlobalSearch />}

        <div className="topbar-actions">
          <QuickActionMenu
            items={quickActions}
            onSelect={(action) => {
              console.log("Selected:", action.key);
            }}
          >
            <SvgIcon name="plus" size={15} />
          </QuickActionMenu>



          <NotificationDropdown
            title="Notifications"
            badgeCount={badgeCount}
            items={notifications}
            onItemClick={handleNotificationClick}
            onMarkAllRead={handleMarkAllAsRead}
            onDeleteItem={handleDeleteNotification}
          >
            <div className="bell-wrapper" style={{ position: 'relative' }}>
              <SvgIcon name="notification" size={20} />
              {badgeCount > 0 && <span className="notification-dot">{badgeCount}</span>}
            </div>
          </NotificationDropdown>

          <div
            className="profile"
            ref={profileAnchorRef}
            style={{ position: "relative" }}
          >
            <div
              className="avatar"
              onClick={() => setProfileOpen((prev) => !prev)}
            >
              <SvgIcon name="user" size={22} style={{ color: "white" }} />
            </div>

            <div
              className="profile-text"
              onClick={() => setProfileOpen((prev) => !prev)}
            >
              <div className="welcome">Welcome, {JSON.parse(localStorage.getItem("user") || "{}").name || "User"}</div>
              <div className="role">{role}</div>
            </div>

            <span
              className="chevron"
              aria-hidden="true"
              onClick={() => setProfileOpen((prev) => !prev)}
            >
              ▾
            </span>

            <ProfileDropdown
              isOpen={profileOpen}
              role={role}
              onRoleChange={setRole}
              onClose={() => setProfileOpen(false)}
              onProfile={() => navigate("/app/employees/me")}
              onSettings={() => console.log("Settings")}
              onLogout={handleLogout}
              anchorRef={profileAnchorRef}
            />
          </div>

        </div>
      </Container>
    </Navbar>
  );
}
