

import { Container, Row, Col, ListGroup } from "react-bootstrap";
import AppCard from "../../components/reusable/Card.jsx";
import AppButton from "../../components/reusable/Button.jsx";
import { useEffect, useState } from "react";
import { getPendingRequests } from "../../services/requestService";
import "../../style/myRequests.css";
import { updateRequestStatus } from "../../services/requestService.js";

export default function AdminRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const handleAction = async (id, action) => {
  await updateRequestStatus(id, { action });

  // remove from admin UI immediately
  setRequests(prev => prev.filter(req => req._id !== id));
};

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const res = await getPendingRequests();
        if (res.success) {
          setRequests(res.data);
        }
      } catch (err) {
        console.error("Failed to load pending requests", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPending();
  }, []);

  const renderRequestDetails = (req) => {
    const { details, requestType } = req;

    switch (requestType) {
      case "LEAVE":
        return (
          <>
            <div className="request-type">{details.leaveType}</div>
            <div className="request-dates">
              {details.fromDate} to {details.toDate} (
              {details.numberOfDays || "N/A"} days)
            </div>
            {details.reason && (
              <div className="request-reason">Reason: {details.reason}</div>
            )}
            {details.remarks && (
              <div className="request-remarks">Remarks: {details.remarks}</div>
            )}
          </>
        );

      case "SALARY":
        return (
          <>
            <div className="request-type">Salary Advance</div>
            <div className="request-amount">
              Amount: {details.amount || "N/A"}
            </div>
            {details.repaymentPeriod && (
              <div className="request-repayment">
                Repayment Period: {details.repaymentPeriod}
              </div>
            )}
            {details.reason && (
              <div className="request-reason">Reason: {details.reason}</div>
            )}
            {details.remarks && (
              <div className="request-remarks">Remarks: {details.remarks}</div>
            )}
          </>
        );

      case "DOCUMENT":
        return (
          <>
            <div className="request-type">{details.documentType}</div>
            {details.purpose && (
              <div className="request-purpose">Purpose: {details.purpose}</div>
            )}
            {details.remarks && (
              <div className="request-remarks">Remarks: {details.remarks}</div>
            )}
          </>
        );

      default:
        return <div className="request-type">{requestType}</div>;
    }
  };

  return (
    <Container fluid className="my-requests-page">
      {/* PAGE HEADER */}
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

      {/* PENDING APPROVALS */}
      <Row>
        <Col>
          <AppCard
            title="Pending Approvals"
            subtitle={`${requests.length} requests awaiting review`}
            className="requests-card"
          >
            {loading ? (
              <div className="loading-message">Loading pending requests...</div>
            ) : requests.length === 0 ? (
              <div className="no-requests">No pending requests</div>
            ) : (
              <ListGroup variant="flush" className="requests-list">
                {requests.map((req) => (
                  <ListGroup.Item key={req._id} className="request-item">
                    <div className="request-info">
                      <div className="request-name">{req.userId?.name}</div>
                      {renderRequestDetails(req)}
                    </div>

                    <div className="request-actions">
                      <AppButton
                        variant="success"
                        onClick={() => handleAction(req._id, "APPROVE")}
                      >
                        Approve
                      </AppButton>

                      <AppButton
                        variant="danger"
                        onClick={() => handleAction(req._id, "REJECT")}
                      >
                        Reject
                      </AppButton>

                    </div>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}
          </AppCard>
        </Col>
      </Row>
    </Container>
  );
}
