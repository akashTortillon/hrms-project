import React, { useState, useEffect } from "react";
import "../../style/EmployeeRequests.css";
import SubmitRequestModal from "./SubmitRequestModal";
import { getMyRequests, withdrawRequest } from "../../services/requestService.js";
import { toast } from "react-toastify";

export default function EmployeeRequests() {
  const [openModal, setOpenModal] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await getMyRequests();
      if (response.success) {
        setRequests(response.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (requestId) => {
    try {
      const response = await withdrawRequest(requestId);
      if (response.success) {
        toast.success(response.message || "Request withdrawn successfully");
        fetchRequests();
      } else {
        toast.error(response.message || "Failed to withdraw request");
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to withdraw request";
      toast.error(errorMessage);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toISOString().split("T")[0];
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      PENDING: { label: "Pending", class: "status-pending", icon: "!" },
      APPROVED: { label: "Approved", class: "status-approved", icon: "✓" },
      REJECTED: { label: "Rejected", class: "status-rejected", icon: "✗" },
      COMPLETED: { label: "Completed", class: "status-completed", icon: "✓" },
      WITHDRAWN: { label: "Withdrawn", class: "status-withdrawn", icon: "↩" }
    };
    const config = statusConfig[status] || statusConfig.PENDING;
    return (
      <span className={`status-badge ${config.class}`}>
        <span className="status-icon">{config.icon}</span>
        {config.label}
      </span>
    );
  };

  const getRequestTypeLabel = (request) => {
    const { requestType, details } = request;
    
    if (requestType === "LEAVE") {
      return details.leaveType || "Leave Request";
    } else if (requestType === "SALARY") {
      return "Salary Advance";
    } else if (requestType === "DOCUMENT") {
      return "Document Request";
    }
    return requestType;
  };

  const getRequestDetails = (request) => {
    const { requestType, details } = request;
    
    if (requestType === "LEAVE") {
      const days = details.numberOfDays
        ? ` (${details.numberOfDays} days)`
        : "";
      return `${details.fromDate} to ${details.toDate}${days}`;
    } else if (requestType === "SALARY") {
      return `Amount: AED ${details.amount}`;
    } else if (requestType === "DOCUMENT") {
      return `Document: ${details.documentType}`;
    }
    return "";
  };
  return (
    <div className="employee-requests">
      {/* HEADER */}
      <div className="requests-header">
        <div>
          <h1 className="requests-title">My Requests</h1>
          <p className="requests-subtitle">
            Submit and track your requests
          </p>
        </div>

        <button className="new-request-btn" onClick={() => setOpenModal(true)} >
          <span className="plus">＋</span>
          New Request
        </button>
      </div>

      {/* LEAVE SUMMARY */}
      <div className="leave-cards">
        {/* Annual Leave */}
        <div className="leave-card">
          <div className="leave-card-header">
            <span className="leave-title">Annual Leave</span>
            <span className="leave-count">
              <strong>22</strong> / 30 days
            </span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill blue"
              style={{ width: "73%" }}
            />
          </div>
        </div>

        {/* Sick Leave */}
        <div className="leave-card">
          <div className="leave-card-header">
            <span className="leave-title">Sick Leave</span>
            <span className="leave-count">
              <strong>13</strong> / 15 days
            </span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill green"
              style={{ width: "87%" }}
            />
          </div>
        </div>

        {/* Unpaid Leave */}
        <div className="leave-card">
          <div className="leave-card-header">
            <span className="leave-title">Unpaid Leave</span>
            <span className="leave-count">
              <strong>0</strong> days taken
            </span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill gray"
              style={{ width: "0%", minWidth: "10px" }}
            />
          </div>
        </div>


        {openModal && (
          <SubmitRequestModal
            onClose={() => setOpenModal(false)}
            onSuccess={fetchRequests}
          />
        )}
      </div>

      {/* REQUEST HISTORY */}
      <div className="request-history-section">
        <div className="request-history-header">
          <h2 className="request-history-title">Request History</h2>
          <p className="request-history-subtitle">
            Track status of your submitted requests
          </p>
        </div>

        {loading ? (
          <div className="loading-message">Loading requests...</div>
        ) : requests.length === 0 ? (
          <div className="no-requests">No requests submitted yet</div>
        ) : (
          <div className="request-list">
            {requests.map((request) => (
              <div key={request._id} className="request-item">
                <div className="request-item-content">
                  <div className="request-item-header">
                    <h3 className="request-item-title">
                      {getRequestTypeLabel(request)}
                    </h3>
                    {getStatusBadge(request.status)}
                  </div>
                  <div className="request-item-meta">
                    Request ID: {request.requestId} • Submitted:{" "}
                    {formatDate(request.submittedAt)}
                  </div>
                  <div className="request-item-details">
                    {getRequestDetails(request)}
                  </div>
                  {request.status === "APPROVED" && request.remarks && (
                    <div className="request-item-approval">
                      Approved by {request.remarks} on{" "}
                      {formatDate(request.updatedAt)}
                    </div>
                  )}
                </div>
                <div className="request-item-actions">
                  {request.status === "PENDING" && (
                    <button
                      className="withdraw-btn"
                      onClick={() => handleWithdraw(request._id)}
                    >
                      Withdraw
                    </button>
                  )}
                  <button className="view-details-btn">View Details</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

