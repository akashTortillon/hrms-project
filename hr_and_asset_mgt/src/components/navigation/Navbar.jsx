import {
  Navbar,
  Container,
  Form,
  InputGroup,
  Button,
} from "react-bootstrap";
import SvgView from "../svgIcon/svgView.jsx";
import "../../style/layout.css";

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
              <span aria-hidden="true">🔍</span>
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
          <Button variant="light" className="icon-btn">
            <span className="icon-plus">+</span>
          </Button>
          <Button variant="light" className="icon-btn notification-btn">
            <SvgView name="notification" size={20} />
            <span className="notification-dot" />
          </Button>
          <div className="profile">
            <div className="avatar">👤</div>
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
