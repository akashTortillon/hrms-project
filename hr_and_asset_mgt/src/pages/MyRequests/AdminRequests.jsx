import { Container, Row, Col, ListGroup } from "react-bootstrap";
import AppCard from "../../components/reusable/Card.jsx";
import AppButton from "../../components/reusable/Button.jsx";
import { myRequests } from "./MyRequestsViewModel.js";
import "../../style/myRequests.css";

export default function AdminRequests() {
  return (
    <Container fluid className="my-requests-page">
      <Row>
        <Col>
          <div className="page-header">
            <h2 className="page-title">Request Management</h2>
            <p className="page-subtitle">
              Review and approve employee requests
            </p>
          </div>
        </Col>
      </Row>

      <Row>
        <Col>
          <AppCard
            title="Pending Approvals"
            subtitle="3 requests awaiting review"
            className="requests-card"
          >
            <ListGroup variant="flush" className="requests-list">
              {myRequests.map((req) => (
                <ListGroup.Item key={req.id} className="request-item">
                  <div className="request-info">
                    <div className="request-name">
                      {req.name}{" "}
                      <span className="request-emp">({req.empId})</span>
                    </div>
                    <div className="request-type">{req.type}</div>
                    <div className="request-dates">
                      {req.dateRange}
                      {req.days ? ` (${req.days} days)` : ""}
                    </div>
                    <div className="request-reason">
                      Reason: {req.reason}
                    </div>
                  </div>
                  <div className="request-actions">
                    <AppButton variant="success">Approve</AppButton>
                    <AppButton variant="danger">Reject</AppButton>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </AppCard>
        </Col>
      </Row>
    </Container>
  );
}

