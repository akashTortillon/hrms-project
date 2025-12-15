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

const quickActions = [
  { label: "Add Employee", key: "addEmployee" },
  { label: "Add Asset", key: "addAsset" },
  { label: "Upload Document", key: "uploadDocument" },
];


export default function NavigationBar() {
  return (
    <Navbar className="topbar" bg="white" expand="lg">
      <Container fluid className="topbar-container">
        <div className="brand">
          
          {/* <Button
            variant="light"
            className="icon-btn back-btn"
            aria-label="Back"
          >
            <span className="arrow-left" />
          </Button> */}
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



          <Button variant="light" className="icon-btn notification-btn">
            <SvgView name="notification" size={20} />
            <span className="notification-dot" />
          </Button>
          <div className="profile">
            <div className="avatar"><SvgIcon name="user" size={22} style={{color:"white"}}/></div>
            <div className="profile-text">
              <div className="welcome">Welcome, Admin User</div>
              <div className="role">Admin</div>
            </div>
            <span className="chevron" aria-hidden="true">
              ▾
            </span>
          </div>
        </div>
      </Container>
    </Navbar>
  );
}
