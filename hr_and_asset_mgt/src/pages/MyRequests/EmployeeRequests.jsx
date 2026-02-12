


import React, { useState, useEffect, useMemo } from "react";
import "../../style/EmployeeRequests.css";
import SubmitRequestModal from "./SubmitRequestModal";
import { getMyRequests, withdrawRequest, downloadDocument } from "../../services/requestService.js";
import { toast } from "react-toastify";
import SvgIcon from "../../components/svgIcon/svgView";
import Card from "../../components/reusable/Card";
import CustomSelect from "../../components/reusable/CustomSelect.jsx";

/* ----------------------------------
   ✅ STATUS TEXT HELPER (DYNAMIC)
---------------------------------- */
const getStatusText = (req) => {
  // Debug log
  console.log("getStatusText called for:", req.requestId, {
    status: req.status,
    approvedAt: req.approvedAt,
    approvedBy: req.approvedBy
  });

  if (!req.approvedAt || !req.approvedBy) return null;

  const date = new Date(req.approvedAt).toLocaleDateString();

  const approverName = req.approvedBy?.name || "Admin";
  const approverRole = req.approvedBy?.role || "";

  const roleLabel = approverRole ? ` (${approverRole})` : "";

  if (req.status === "APPROVED")
    return `Approved by ${approverName}${roleLabel} on ${date}`;

  if (req.status === "REJECTED")
    return `Rejected by ${approverName}${roleLabel} on ${date}`;

  if (req.status === "COMPLETED")
    return `Completed by ${approverName}${roleLabel} on ${date}`;

  return null;
};

export default function EmployeeRequests() {
  const [openModal, setOpenModal] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [requestType, setRequestType] = useState("All");
  const [status, setStatus] = useState("All");

  /* ----------------------------------
     LEAVE CONFIG (Denominators)
  ---------------------------------- */
  const LEAVE_LIMITS = {
    "Annual Leave": 30,
    "Sick Leave": 15,
    "Unpaid Leave": null
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await getMyRequests();
      if (response.success) {
        console.log("🔍 EMPLOYEE REQUESTS DATA:", response.data);
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
      toast.error(
        error.response?.data?.message ||
        error.message ||
        "Failed to withdraw request"
      );
    }
  };

  /* ----------------------------------
     LEAVE USAGE CALCULATION
  ---------------------------------- */
  const leaveUsage = useMemo(() => {
    const usage = {
      "Annual Leave": 0,
      "Sick Leave": 0,
      "Unpaid Leave": 0
    };

    requests.forEach((req) => {
      if (
        req.requestType === "LEAVE" &&
        ["APPROVED", "COMPLETED"].includes(req.status)
      ) {
        const leaveType = req.details?.leaveType;
        const days = Number(req.details?.numberOfDays || 0);

        if (usage[leaveType] !== undefined) {
          usage[leaveType] += days;
        }
      }
    });

    return usage;
  }, [requests]);

  const getProgress = (used, total) => {
    if (!total) return 0;
    return Math.min((used / total) * 100, 100);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toISOString().split("T")[0];
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      PENDING: {
        label: "Pending",
        class: "status-pending",
        icon: <SvgIcon name="circle-tick" size={15} />
      },
      APPROVED: {
        label: "Approved",
        class: "status-approved",
        icon: <SvgIcon name="circle-tick" size={15} />
      },
      REJECTED: {
        label: "Rejected",
        class: "status-rejected",
        icon: <SvgIcon name="circle-xmark" size={15} />
      },
      COMPLETED: {
        label: "Completed",
        class: "status-completed",
        icon: <SvgIcon name="circle-tick" size={15} />
      },
      WITHDRAWN: {
        label: "Withdrawn",
        class: "status-withdrawn",
        icon: <SvgIcon name="arrow-uturn-cw-left" size={15} />
      }
    };

    const config = statusConfig[status] || statusConfig.PENDING;

    return (
      <span className={`status-badge ${config.class}`}>
        <span className="status-icon">{config.icon}</span>
        {config.label}
      </span>
    );
  };

  /* ----------------------------------
     REQUEST LABELS & DETAILS
  ---------------------------------- */

  // ✅ UPDATED: Salary subType support (loan / advance)
  const getRequestTypeLabel = (request) => {
    if (request.requestType === "LEAVE") return request.details.leaveType;

    if (request.requestType === "SALARY") {
      return request.subType === "loan"
        ? "Loan Application"
        : "Salary Advance";
    }

    if (request.requestType === "DOCUMENT") return "Document Request";
    return request.requestType;
  };

  const getRequestDetails = (request) => {
    if (request.requestType === "LEAVE") {
      const days = request.details.numberOfDays
        ? ` (${request.details.numberOfDays} days)`
        : "";
      return `${request.details.fromDate} to ${request.details.toDate}${days}`;
    }
    if (request.requestType === "SALARY") {
      return `Amount: AED ${request.details.amount}`;
    }
    if (request.requestType === "DOCUMENT") {
      return `Document: ${request.details.documentType}`;
    }
    return "";
  };

  const handleDownloadDocument = async (requestId) => {
    try {
      const blob = await downloadDocument(requestId);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `document-${requestId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Document downloaded successfully");
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download document');
    }
  };





  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      // 🔍 Search (ID / type / leave type)
      const searchText = search.toLowerCase();

      const matchesSearch =
        !searchText ||
        req.requestId?.toLowerCase().includes(searchText) ||
        req.requestType?.toLowerCase().includes(searchText) ||
        req.details?.leaveType?.toLowerCase().includes(searchText);

      // 📌 Request Type filter
      const matchesType =
        requestType === "All" || req.requestType === requestType;

      //  Status filter
      const matchesStatus =
        status === "All" || req.status === status;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [requests, search, requestType, status]);





  return (
    <div className="employee-requests">
      {/* HEADER */}
      <div className="requests-header">
        <div>
          <h1 className="requests-title">My Requests</h1>
          <p className="requests-subtitle">Submit and track your requests</p>
        </div>

        <button className="new-request-btn" onClick={() => setOpenModal(true)}>
          <span className="plus">＋</span>
          New Request
        </button>
      </div>

      {/* LEAVE SUMMARY */}
      <div className="leave-cards">
        {Object.keys(LEAVE_LIMITS).map((leaveType) => {
          const used = leaveUsage[leaveType] || 0;
          const total = LEAVE_LIMITS[leaveType];
          const progress = getProgress(used, total);

          // Mapping for Luxury 2.0 styling
          const config = {
            "Annual Leave": { color: "blue", icon: "calendar" },
            "Sick Leave": { color: "green", icon: "calendar" }, // use healing or similar
            "Unpaid Leave": { color: "orange", icon: "calendar" },
          };
          const { color, icon } = config[leaveType] || { color: "gray", icon: "cube" };

          return (
            <Card key={leaveType} luxury={true} className={`leave-summary-card vibrant-${color}`}>
              <div className="leave-card-content">
                <div className="leave-card-main">
                  <div className="leave-card-info">
                    <span className="leave-title">{leaveType}</span>
                    <span className="leave-count">
                      <strong>{used}</strong>{" "}
                      {total ? `/ ${total} days` : "days taken"}
                    </span>
                  </div>
                  <div className="leave-card-icon-wrapper">
                    <SvgIcon name={icon} size={24} color="#ffffff" />
                  </div>
                </div>

                <div className="progress-container">
                  <div className="progress-bar-luxury">
                    <div
                      className="progress-fill-luxury"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>


      {/* Requests Filters */}
      <div className="requests-filters-card">
        <div className="requests-filters">

          {/* Search */}
          <div className="requests-search">
            <SvgIcon name="search" size={18} />
            <input
              type="text"
              placeholder="Search by request type ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Request Type */}
          <CustomSelect
            // className="requests-select"
            value={requestType}
            placeholder="All Request Types"
            options={[
              { value: "All", label: "All Request Types" },
              { value: "LEAVE", label: "Leave" },
              { value: "SALARY", label: "Salary" },
              { value: "DOCUMENT", label: "Document" }
            ]}
            onChange={(value) => setRequestType(value)}
          />
          {/* Status */}
          <CustomSelect
            // className="requests-select"
            value={status}
            placeholder="All Status"
            options={[
              { value: "All", label: "All Status" },
              { value: "PENDING", label: "Pending" },
              { value: "APPROVED", label: "Approved" },
              { value: "REJECTED", label: "Rejected" },
              { value: "COMPLETED", label: "Completed" }
            ]}
            onChange={(value) => setStatus(value)}
          />


        </div>

        <div className="requests-count">
          Showing {filteredRequests.length} Requests

        </div>
      </div>






      {/* REQUEST HISTORY */}
      <div className="request-history-section">
        {loading ? (
          <div className="loading-message">Loading requests...</div>
        ) : requests.length === 0 ? (
          <div className="no-requests">No requests submitted yet</div>
        ) : (
          <div className="request-list">
            {filteredRequests.map((request) => {
              const statusText = getStatusText(request);

              return (
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

                    {/* ✅ STATUS NOTE */}
                    {statusText && (
                      <div className="request-status-note">
                        {statusText}
                      </div>
                    )}

                    {/* ✅ REJECTION REASON */}
                    {request.status === "REJECTED" &&
                      request.rejectionReason && (
                        <div className="request-rejection-reason">
                          <strong>Rejection Reason:</strong>{" "}
                          {request.rejectionReason}
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
                    {/* ✅ UPDATED: Download button for completed document requests */}
                    {request.requestType === "DOCUMENT" &&
                      request.status === "COMPLETED" &&
                      request.uploadedDocument && (
                        <button
                          className="download-btn"
                          onClick={() => handleDownloadDocument(request._id)}
                        >
                          Download Document
                        </button>
                      )}
                    {/* <button className="view-details-btn">
                      View Details
                    </button> */}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {openModal && (
        <SubmitRequestModal
          onClose={() => setOpenModal(false)}
          onSuccess={fetchRequests}
        />
      )}
    </div>
  );
}