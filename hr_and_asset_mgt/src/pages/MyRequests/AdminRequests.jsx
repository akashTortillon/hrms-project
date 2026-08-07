import { Container, Row, Col, ListGroup } from "react-bootstrap";
import AppCard from "../../components/reusable/Card.jsx";
import AppButton from "../../components/reusable/Button.jsx";
import { useEffect, useState, useMemo } from "react";
import SvgIcon from "../../components/svgIcon/svgView.jsx";


import {
  getPendingRequests,
  updateRequestStatus,
  approveDocumentRequest,
  rejectDocumentRequest,
  revokeLeaveRequest,
} from "../../services/requestService";
import "../../style/myRequests.css";
import DocumentApproveModal from "./DocumentApproveModal.jsx";
import SalaryApproveModal from "./SalaryApproveModal.jsx";
import LeaveApproveModal from "./LeaveApproveModal.jsx";

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

  // ✅ Leave approval modal states (HR final-approval stage only — lets HR override
  // the number of days actually granted for a partial approval)
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [selectedLeaveReq, setSelectedLeaveReq] = useState(null);

  // Rejection dialog states
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [isDocumentRequest, setIsDocumentRequest] = useState(false);

  // Revoke-approved-leave dialog states
  const [showRevokeReason, setShowRevokeReason] = useState(false);
  const [revokeReason, setRevokeReason] = useState("");
  const [revokeRequestId, setRevokeRequestId] = useState(null);

  // History filters
  const [search, setSearch] = useState("");
  const [requestTypeFilter, setRequestTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);
  const currentRole = localStorage.getItem("userRole");
  const currentRoleLabel = String(currentRole || "");
  const currentPermissions = currentUser?.permissions || [];
  const canActAsHr = currentRole === "Admin" || /^HR/i.test(currentRoleLabel) || currentPermissions.includes("ALL") || currentPermissions.includes("APPROVE_REQUESTS");
  const canActAsFinance = /^Finance/i.test(currentRoleLabel) || currentPermissions.includes("ALL") || currentPermissions.includes("APPROVE_FINANCE_REQUESTS");
  const isDesignatedManager = (req) => {
    const managerId = req.designatedManager?._id || req.designatedManager;
    return Boolean(
      managerId &&
      (
        managerId === currentUser?._id ||
        managerId === currentUser?.id ||
        managerId === currentUser?.employeeId
      )
    );
  };
  const canActAsManager = (req) => (
    req.currentApprovalStage === "MANAGER" &&
    (currentRole === "Manager" || currentPermissions.includes("APPROVE_MANAGER_REQUESTS")) &&
    isDesignatedManager(req)
  );
  const isDesignatedFinanceManager = (req) => {
    const financeId = req.designatedFinanceManager?._id || req.designatedFinanceManager;
    return Boolean(
      financeId &&
      (
        financeId === currentUser?._id ||
        financeId === currentUser?.id ||
        financeId === currentUser?.employeeId
      )
    );
  };
  const canShowFinanceButtons = (req) => (
    req.currentApprovalStage === "FINANCE" &&
    canActAsFinance &&
    isDesignatedFinanceManager(req)
  );
  const canShowActionButtons = (req) => {
    if (req.currentApprovalStage === "MANAGER") return canActAsManager(req);
    if (req.currentApprovalStage === "FINANCE") return canShowFinanceButtons(req);
    if (req.currentApprovalStage === "HR") return canActAsHr;
    return false;
  };
  const getStageLabel = (req) => {
    if (req.currentApprovalStage === "MANAGER") return "Waiting for manager approval";
    if (req.currentApprovalStage === "FINANCE") return "Finance approval pending";
    if (req.currentApprovalStage === "HR") return "HR approval pending";
    return "Completed";
  };

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
    } else if (request.requestType === "SALARY" &&
      (request.currentApprovalStage === "HR" || request.currentApprovalStage === "FINANCE")) {
      // Open salary modal for both Finance (level 1) and HR (final sanction)
      setSelectedSalaryReq(request);
      setShowSalaryModal(true);
    } else if (request.requestType === "LEAVE" && request.currentApprovalStage === "HR") {
      // Open leave modal at the final HR-approval stage only — this is where the
      // approved-days override actually takes effect server-side. A manager-stage
      // leave approval (forwarding to HR) stays a direct one-click approve.
      setSelectedLeaveReq(request);
      setShowLeaveModal(true);
    } else {
      // Direct approval for LEAVE at manager stage (and others if any)
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
        amount: data.amount,
        repaymentPeriod: data.repaymentPeriod,
        startCurrentCycle: data.startCurrentCycle
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

  // ✅ Leave approval handler (HR final stage, with optional approved-days override)
  const handleLeaveApprove = async (requestId, data) => {
    try {
      setProcessing(true);
      await updateRequestStatus(requestId, {
        action: "APPROVE",
        approvedDays: data.approvedDays
      });
      await fetchRequests();
      setShowLeaveModal(false);
      setSelectedLeaveReq(null);
    } catch (err) {
      console.error("Failed to approve leave request", err);
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

  // ✅ Revoke an already-approved leave — opens straight to the reason dialog
  // (no separate yes/no confirm step, matching the destructiveness already being
  // gated by the required reason + HR-only visibility on the button itself).
  const handleRevokeClick = (request) => {
    setRevokeRequestId(request._id);
    setShowRevokeReason(true);
  };

  const submitRevoke = async () => {
    if (!revokeReason.trim()) {
      alert("Please provide a reason for revoking this leave");
      return;
    }

    try {
      setProcessing(true);
      await revokeLeaveRequest(revokeRequestId, revokeReason.trim());
      setShowRevokeReason(false);
      setRevokeReason("");
      setRevokeRequestId(null);
      await fetchRequests();
    } catch (err) {
      console.error("Failed to revoke leave", err);
      alert(err.response?.data?.message || "Failed to revoke leave. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const cancelRevoke = () => {
    setShowRevokeReason(false);
    setRevokeReason("");
    setRevokeRequestId(null);
  };

  /* =========================
     DATA SEGREGATION
  ========================= */

  const pendingRequests = requests.filter((r) => ["PENDING", "MANAGER_APPROVED", "FINANCE_APPROVED"].includes(r.status));

  const historyRequests = requests.filter((r) =>
    ["WITHDRAWN", "APPROVED", "REJECTED", "COMPLETED", "REVOKED"].includes(r.status)
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
    if (req.status === "REVOKED") return "Revoked";
    return null;
  };

  const getRevokeMessage = (req) => {
    if (req.status !== "REVOKED") return null;
    const name = req.revokedBy?.name || "HR";
    const time = req.revokedAt ? new Date(req.revokedAt).toLocaleString() : "";
    return `Revoked by ${name}${time ? ` at ${time}` : ""}${req.revokedReason ? ` — ${req.revokedReason}` : ""}`;
  };

  const canRevoke = (req) => (
    req.requestType === "LEAVE" && req.status === "APPROVED" && canActAsHr
  );

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

      case "SALARY": {
        const requestedAmount = details.requestedAmount ?? details.amount;
        const financeApprovedAmount = details.financeApprovedAmount;
        const finalApprovedAmount = req.status === "APPROVED" ? details.amount : null;

        return (
          <>
            <div className="request-type">
              {details.subType === "loan" ? "Loan Application" : "Salary Advance"}
            </div>
            <div className="request-amount">
              Requested Amount: {requestedAmount || "N/A"}
            </div>
            {financeApprovedAmount !== undefined && financeApprovedAmount !== null && (
              <div className="request-amount">
                Finance Approved: {financeApprovedAmount}
              </div>
            )}
            {finalApprovedAmount !== null && (
              <div className="request-amount">
                Final Approved: {finalApprovedAmount}
              </div>
            )}
            {(details.subType === "loan" || subType === "loan") && details.repaymentPeriod && (
              <div className="request-repayment">
                Repayment Period: {details.repaymentPeriod} month{Number(details.repaymentPeriod) === 1 ? "" : "s"}
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
      }

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
                      <div className="request-type" style={{ marginBottom: "4px", color: "#2563eb" }}>
                        Stage: {getStageLabel(req)}
                      </div>
                      {renderRequestDetails(req)}
                    </div>

                    <div className="request-actions">
                      {!canShowActionButtons(req) ? (
                        <div style={{
                          background: '#fef3c7', color: '#92400e', borderRadius: '8px',
                          padding: '8px 14px', fontSize: '13px', fontWeight: '600'
                        }}>
                          {req.currentApprovalStage === "MANAGER"
                            ? "Waiting for manager approval"
                            : (req.currentApprovalStage === "FINANCE" ? "Waiting for finance approval" : "HR approval pending")}
                        </div>
                      ) : (
                        <>
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
                            style={{ marginLeft: '8px' }}
                          >
                            {processing ? "..." : "Reject"}
                          </AppButton>
                        </>
                      )}
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
                        <select
                          value={requestTypeFilter}
                          onChange={(e) => setRequestTypeFilter(e.target.value)}
                          className="requests-select"
                          style={{
                            width: "100%",
                            padding: "8px",
                            borderRadius: "6px",
                            border: "1px solid #d1d5db",
                            backgroundColor: "white",
                            fontSize: "14px",
                            height: "38px"
                          }}
                        >
                          <option value="All">All Types</option>
                          <option value="LEAVE">Leave</option>
                          <option value="SALARY">Salary</option>
                          <option value="DOCUMENT">Document</option>
                        </select>
                      </div>

                      <div style={{ width: '100%' }}>
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="requests-select"
                          style={{
                            width: "100%",
                            padding: "8px",
                            borderRadius: "6px",
                            border: "1px solid #d1d5db",
                            backgroundColor: "white",
                            fontSize: "14px",
                            height: "38px"
                          }}
                        >
                          <option value="All">All Status</option>
                          <option value="APPROVED">Approved</option>
                          <option value="REJECTED">Rejected</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="WITHDRAWN">Withdrawn</option>
                          <option value="REVOKED">Revoked</option>
                        </select>
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
                        const revokeMsg = getRevokeMessage(req);
                        const statusDisplay = getStatusDisplay(req);

                        return (
                          <ListGroup.Item key={req._id} className="request-item">
                            <div className="request-info">
                              <div className="request-name">
                                {req.userId?.name}
                              </div>
                              {renderRequestDetails(req)}
                            </div>

                            <div className="request-actions" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                              {withdrawMsg ? (
                                <div className="request-withdraw-message">
                                  {withdrawMsg}
                                </div>
                              ) : revokeMsg ? (
                                <div className="request-withdraw-message">
                                  {revokeMsg}
                                </div>
                              ) : statusDisplay ? (
                                <div className="request-status-display">
                                  {statusDisplay}
                                </div>
                              ) : null}
                              {canRevoke(req) && (
                                <AppButton
                                  variant="danger"
                                  onClick={() => handleRevokeClick(req)}
                                  disabled={processing}
                                  style={{ fontSize: '12px', padding: '4px 10px' }}
                                >
                                  Revoke
                                </AppButton>
                              )}
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

      {/* REVOKE REASON */}
      {showRevokeReason && (
        <div className="dialog-overlay">
          <div className="dialog-box">
            <h3 className="dialog-title">Revoke Approved Leave</h3>
            <p className="dialog-message">
              This reverses the marked attendance and credits the leave balance back.
              Please provide a reason:
            </p>
            <textarea
              className="rejection-textarea"
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              placeholder="Enter reason here..."
              rows={5}
            />
            <div className="dialog-actions">
              <button
                className="dialog-btn dialog-btn-cancel"
                onClick={cancelRevoke}
              >
                Cancel
              </button>
              <button
                className="dialog-btn dialog-btn-submit"
                onClick={submitRevoke}
                disabled={processing}
              >
                {processing ? "Revoking..." : "Revoke Leave"}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* LEAVE APPROVE MODAL */}
      <LeaveApproveModal
        show={showLeaveModal}
        request={selectedLeaveReq}
        onClose={() => {
          setShowLeaveModal(false);
          setSelectedLeaveReq(null);
        }}
        onApprove={handleLeaveApprove}
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
