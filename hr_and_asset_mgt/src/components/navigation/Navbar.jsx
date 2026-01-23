import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Navbar,
  Container,
  Form,
  InputGroup,
  Button,
} from "react-bootstrap";
import SvgView from "../svgIcon/svgView.jsx";
import "../../style/layout.css";
import SvgIcon from "../svgIcon/svgView.jsx";
import QuickActionMenu from "../reusable/QuickActionMenu";
import NotificationDropdown from "../reusable/NotificationDropdown";
import ProfileDropdown from "../reusable/ProfileDropdown";
import "../../style/Profile.css";
import { useRole } from "../../contexts/RoleContext.jsx";
import { logoutUser } from "../../api/authService";


const quickActions = [
  { label: "Add Employee", key: "addEmployee" },
  { label: "Add Asset", key: "addAsset" },
  { label: "Upload Document", key: "uploadDocument" },
];

const notifications = [
  { title: "5 Documents Expiring Soon", time: "2 hours ago" },
  { title: "3 Leave Requests Pending", time: "5 hours ago" },
  { title: "Payroll Processing Due", time: "1 day ago" },
];

export default function NavigationBar() {
  const [profileOpen, setProfileOpen] = useState(false);
  const { role, setRole } = useRole();
  const profileAnchorRef = useRef(null);
  const navigate = useNavigate();

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

        <Form className="search-form">
          <InputGroup>
            <InputGroup.Text className="search-icon">
              <span aria-hidden="true"><SvgIcon name="search" size={15} /></span>
            </InputGroup.Text>
            <Form.Control
              type="search"
              placeholder="Search employees, documents, assets..."
              aria-label="Search"
              className="search-input"
            />
          </InputGroup>
        </Form>

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
            badgeCount={3}
            items={notifications}
            footerAction={{
              label: "View All Notifications",
              onClick: () => console.log("View all clicked"),
            }}
          >
            <SvgView name="notification" size={20} />
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
              onProfile={() => console.log("My Profile")}
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
