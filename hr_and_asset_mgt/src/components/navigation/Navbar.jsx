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
    if (notif.link) {
      navigate(notif.link);
    }
    if (notif.isVirtual) {
      try {
        await dismissVirtualNotification(notif._id);
      } catch (e) {
        console.error("Failed to dismiss virtual notification", e);
      }
    } else if (!notif.isRead) {
      try {
        await markNotificationAsRead(notif._id);
      } catch (e) {
        console.error("Failed to mark notification as read", e);
      }
    }
    loadNotifications();
  };

  const handleMarkAllAsRead = async () => {
    await markAllNotificationsAsRead();
    loadNotifications();
  };

  const handleDeleteNotification = async (item) => {
    const id = item?.id ?? item?._id;
    if (item?.isVirtual) {
      try {
        await dismissVirtualNotification(id);
      } catch (e) {
        console.error("Failed to dismiss virtual notification", e);
      }
    } else {
      try {
        await deleteNotification(id);
      } catch (e) {
        console.error("Failed to delete notification", e);
      }
    }
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
              switch (action?.key) {
                case "addEmployee":
                  navigate("/app/employees");
                  break;
                case "addAsset":
                  navigate("/app/assets");
                  break;
                case "uploadDocument":
                  navigate("/app/documents");
                  break;
                default:
                  break;
              }
            }}
          >
            <SvgIcon name="plus" size={15} className="svg-icon-black" />
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
