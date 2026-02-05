import { Container, Row, Col, ListGroup } from "react-bootstrap";
import AppCard from "../../components/reusable/Card.jsx";
import AppButton from "../../components/reusable/Button.jsx";
import { useEffect, useState, useMemo } from "react";
import SvgIcon from "../../components/svgIcon/svgView.jsx";
import CustomSelect from "../../components/reusable/CustomSelect";

import {
  getPendingRequests,
  updateRequestStatus,
  approveDocumentRequest,
  rejectDocumentRequest,
} from "../../services/requestService";
import "../../style/myRequests.css";
import DocumentApproveModal from "./DocumentApproveModal.jsx";
import SalaryApproveModal from "./SalaryApproveModal.jsx";

export default function AdminRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // ✅ Document request modal states
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // ✅ Salary request modal states
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [selectedSalaryReq, setSelectedSalaryReq] = useState(null);

  // Rejection dialog states
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [isDocumentRequest, setIsDocumentRequest] = useState(false);

  // History filters
  const [search, setSearch] = useState("");
  const [requestTypeFilter, setRequestTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await getPendingRequests();
      if (res.success) {
        console.log("🔍 ADMIN REQUESTS DATA:", res.data);
        setRequests(res.data);
      }
    } catch (err) {
      console.error("Failed to load requests", err);
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     ACTION HANDLERS
  ========================= */

  // ✅ UPDATED: Handle approve - check if document or salary request
  const handleApprove = async (request) => {
    if (request.requestType === "DOCUMENT") {
      // Open modal for document upload
      setSelectedRequest(request);
      setShowApproveModal(true);
    } else if (request.requestType === "SALARY") {
      // Open modal for Salary (Loan/Advance) approval
      setSelectedSalaryReq(request);
      setShowSalaryModal(true);
    } else {
      // Direct approval for LEAVE (and others if any)
      try {
        setProcessing(true);
        await updateRequestStatus(request._id, { action: "APPROVE" });
        await fetchRequests();
      } catch (err) {
        console.error("Failed to approve request", err);
      } finally {
        setProcessing(false);
      }
    }
  };

  // ✅ Salary approval handler
  const handleSalaryApprove = async (requestId, data) => {
    try {
      setProcessing(true);
      await updateRequestStatus(requestId, {
        action: "APPROVE",
        interestRate: data.interestRate,
        repaymentPeriod: data.repaymentPeriod
      });
      await fetchRequests();
      setShowSalaryModal(false);
      setSelectedSalaryReq(null);
    } catch (err) {
      console.error("Failed to approve salary request", err);
      alert("Failed to approve request. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  // ✅ Document request approval handler
  const handleDocumentApprove = async (requestId, formData) => {
    try {
      setProcessing(true);
      await approveDocumentRequest(requestId, formData);
      await fetchRequests();
      setShowApproveModal(false);
      setSelectedRequest(null);
    } catch (err) {
      console.error("Failed to approve document request", err);
      alert("Failed to approve document request. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  // ✅ UPDATED: Handle reject click - check if document request
  const handleRejectClick = (request) => {
    setSelectedRequestId(request._id);
    setIsDocumentRequest(request.requestType === "DOCUMENT");
    setShowRejectConfirm(true);
  };

  const confirmReject = () => {
    setShowRejectConfirm(false);
    setShowRejectReason(true);
  };

  // ✅ UPDATED: Submit rejection - handle both document and non-document requests
  const submitRejection = async () => {
    if (!rejectionReason.trim()) {
      alert("Please provide a reason for rejection");
      return;
    }

    try {
      setProcessing(true);
      if (isDocumentRequest) {
        // Use document-specific rejection endpoint
        await rejectDocumentRequest(selectedRequestId, rejectionReason.trim());
      } else {
        // Use standard rejection for LEAVE and SALARY
        await updateRequestStatus(selectedRequestId, {
          action: "REJECT",
          rejectionReason: rejectionReason.trim(),
        });
      }

      setShowRejectReason(false);
      setRejectionReason("");
      setSelectedRequestId(null);
      setIsDocumentRequest(false);

      await fetchRequests();
    } catch (err) {
      console.error("Failed to reject request", err);
      alert("Failed to reject request. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const cancelReject = () => {
    setShowRejectConfirm(false);
    setShowRejectReason(false);
    setRejectionReason("");
    setSelectedRequestId(null);
    setIsDocumentRequest(false);
  };

  /* =========================
     DATA SEGREGATION
  ========================= */

  const pendingRequests = requests.filter((r) => r.status === "PENDING");

  const historyRequests = requests.filter((r) =>
    ["WITHDRAWN", "APPROVED", "REJECTED", "COMPLETED"].includes(r.status)
  );

  /* =========================
     HELPERS
  ========================= */

  const getWithdrawMessage = (req) => {
    if (req.status === "WITHDRAWN") {
      const name = req.withdrawnBy?.name || "Unknown User";
      const time = req.withdrawnAt
        ? new Date(req.withdrawnAt).toLocaleString()
        : "Unknown Time";
      return `The request withdrawn by ${name} at ${time}`;
    }
    return null;
  };

  const getStatusDisplay = (req) => {
    if (req.status === "APPROVED") return "Approved";
    if (req.status === "REJECTED") return "Rejected";
    if (req.status === "COMPLETED") return "Completed";
    return null;
  };

  /* =========================
     REQUEST DETAILS RENDERER
     (✅ subType support added)
  ========================= */

  const renderRequestDetails = (req) => {
    const { details, requestType, subType } = req;

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
            <div className="request-type">
              {subType === "loan" ? "Loan Application" : "Salary Advance"}
            </div>
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

  /* =========================
     ✅ FILTERED HISTORY REQUESTS
  ========================= */

  const filteredHistoryRequests = useMemo(() => {
    const text = search.toLowerCase();

    return historyRequests.filter((req) => {
      const matchesSearch =
        !text ||
        req.userId?.name?.toLowerCase().includes(text) ||
        req.requestType?.toLowerCase().includes(text) ||
        req.details?.documentType?.toLowerCase().includes(text) ||
        req.details?.leaveType?.toLowerCase().includes(text);

      const matchesType =
        requestTypeFilter === "All" || req.requestType === requestTypeFilter;

      const matchesStatus = statusFilter === "All" || req.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [historyRequests, search, requestTypeFilter, statusFilter]);

  /* =========================
     UI
  ========================= */

  return (
    <Container fluid className="my-requests-page">
      {/* HEADER */}
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

      {/* PENDING REQUESTS */}
      <Row>
        <Col>
          <AppCard
            title="Pending Approvals"
            subtitle={`${pendingRequests.length} requests awaiting review`}
            className="requests-card"
          >
            {loading ? (
              <div className="loading-message">Loading pending requests...</div>
            ) : pendingRequests.length === 0 ? (
              <div className="no-requests">No pending requests</div>
            ) : (
              <ListGroup variant="flush" className="requests-list">
                {pendingRequests.map((req) => (
                  <ListGroup.Item key={req._id} className="request-item">
                    <div className="request-info">
                      <div className="request-name">{req.userId?.name}</div>
                      {renderRequestDetails(req)}
                    </div>

                    <div className="request-actions">
                      <AppButton
                        variant="success"
                        onClick={() => handleApprove(req)}
                        disabled={processing}
                      >
                        {processing ? "..." : "Approve"}
                      </AppButton>
                      <AppButton
                        variant="danger"
                        onClick={() => handleRejectClick(req)}
                        disabled={processing}
                      >
                        {processing ? "..." : "Reject"}
                      </AppButton>
                    </div>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}
          </AppCard>
        </Col>
      </Row>

      {/* HISTORY */}
      {historyRequests.length > 0 && (
        <Row className="mt-4">
          <Col>
            <div className="history-container">
              <button
                className="history-toggle-btn"
                onClick={() => setHistoryOpen(!historyOpen)}
              >
                <span className="toggle-icon">{historyOpen ? "−" : "+"}</span>
                Requests History ({historyRequests.length})
              </button>

              {historyOpen && (
                <div className="history-content">
                  {/* ✅ FILTER BAR */}
                  <div className="requests-filters-card">
                    <div className="requests-filters">
                      <div className="requests-search">
                        <SvgIcon name="search" size={16} />
                        <input
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Search by name or type..."
                        />
                      </div>

                      <div style={{ width: '100%' }}>
                        <CustomSelect
                          value={requestTypeFilter}
                          onChange={setRequestTypeFilter}
                          className="requests-select"
                          options={[
                            { value: "All", label: "All Types" },
                            { value: "LEAVE", label: "Leave" },
                            { value: "SALARY", label: "Salary" },
                            { value: "DOCUMENT", label: "Document" }
                          ]}
                        />
                      </div>

                      <div style={{ width: '100%' }}>
                        <CustomSelect
                          value={statusFilter}
                          onChange={setStatusFilter}
                          className="requests-select"
                          options={[
                            { value: "All", label: "All Status" },
                            { value: "APPROVED", label: "Approved" },
                            { value: "REJECTED", label: "Rejected" },
                            { value: "COMPLETED", label: "Completed" },
                            { value: "WITHDRAWN", label: "Withdrawn" }
                          ]}
                        />
                      </div>
                    </div>

                    <div className="requests-count">
                      Showing {filteredHistoryRequests.length} of{" "}
                      {historyRequests.length} requests
                    </div>
                  </div>

                  {/* ✅ FIX: Using filteredHistoryRequests instead of historyRequests */}
                  {filteredHistoryRequests.length === 0 ? (
                    <div className="no-requests">
                      No requests match your filters
                    </div>
                  ) : (
                    <ListGroup variant="flush" className="requests-list">
                      {filteredHistoryRequests.map((req) => {
                        const withdrawMsg = getWithdrawMessage(req);
                        const statusDisplay = getStatusDisplay(req);

                        return (
                          <ListGroup.Item key={req._id} className="request-item">
                            <div className="request-info">
                              <div className="request-name">
                                {req.userId?.name}
                              </div>
                              {renderRequestDetails(req)}
                            </div>

                            <div className="request-actions">
                              {withdrawMsg ? (
                                <div className="request-withdraw-message">
                                  {withdrawMsg}
                                </div>
                              ) : statusDisplay ? (
                                <div className="request-status-display">
                                  {statusDisplay}
                                </div>
                              ) : null}
                            </div>
                          </ListGroup.Item>
                        );
                      })}
                    </ListGroup>
                  )}
                </div>
              )}
            </div>
          </Col>
        </Row>
      )}

      {/* DOCUMENT APPROVE MODAL */}
      <DocumentApproveModal
        show={showApproveModal}
        request={selectedRequest}
        onClose={() => {
          setShowApproveModal(false);
          setSelectedRequest(null);
        }}
        onApprove={handleDocumentApprove}
      />

      {/* SALARY APPROVE MODAL */}
      <SalaryApproveModal
        show={showSalaryModal}
        request={selectedSalaryReq}
        onClose={() => {
          setShowSalaryModal(false);
          setSelectedSalaryReq(null);
        }}
        onApprove={handleSalaryApprove}
      />

      {/* REJECT CONFIRM */}
      {showRejectConfirm && (
        <div className="dialog-overlay">
          <div className="dialog-box">
            <h3 className="dialog-title">Confirm Rejection</h3>
            <p className="dialog-message">
              Do you need to reject this request?
            </p>
            <div className="dialog-actions">
              <button
                className="dialog-btn dialog-btn-no"
                onClick={cancelReject}
              >
                No
              </button>
              <button
                className="dialog-btn dialog-btn-yes"
                onClick={confirmReject}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT REASON */}
      {showRejectReason && (
        <div className="dialog-overlay">
          <div className="dialog-box">
            <h3 className="dialog-title">Rejection Reason</h3>
            <p className="dialog-message">
              Please provide a reason for rejection:
            </p>
            <textarea
              className="rejection-textarea"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter reason here..."
              rows={5}
            />
            <div className="dialog-actions">
              <button
                className="dialog-btn dialog-btn-cancel"
                onClick={cancelReject}
              >
                Cancel
              </button>
              <button
                className="dialog-btn dialog-btn-submit"
                onClick={submitRejection}
                disabled={processing}
              >
                {processing ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
}