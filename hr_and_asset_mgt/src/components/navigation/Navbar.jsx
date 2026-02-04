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
import Button from "../reusable/Button.jsx"


const quickActions = [
  { label: "Add Employee", key: "addEmployee" },
  { label: "Add Asset", key: "addAsset" },
  { label: "Upload Document", key: "uploadDocument" },
];

export default function NavigationBar({ toggleSidebar, isSidebarOpen }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [badgeCount, setBadgeCount] = useState(0);

  const { role, setRole, hasPermission } = useRole();
  const profileAnchorRef = useRef(null);
  const navigate = useNavigate();

  // Load notifications
  const loadNotifications = async () => {
    try {
      const data = await fetchNotifications();
      setNotifications(data);
      const count = await getUnreadCount();
      setBadgeCount(count);
    } catch (err) {
      console.error("Failed to load notifications", err);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      await markNotificationAsRead(notif._id);
      loadNotifications();
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllNotificationsAsRead();
    loadNotifications();
  };

  const handleDeleteNotification = async (id) => {
    await deleteNotification(id);
    loadNotifications();
  };

  const handleLogout = () => {
    logoutUser();
    navigate("/login");
  };

  return (
    <Navbar className="topbar" bg="white" expand="lg">
      <Container fluid className="topbar-container">
        <div className="brand">
          <Button
            variant="light"
            className="hamburger-btn d-lg-none"
            onClick={toggleSidebar}
          >
            <SvgIcon name={isSidebarOpen ? "close" : "menu"} size={22} />
          </Button>
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
