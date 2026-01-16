


// import React, { useState, useEffect, useMemo } from "react";
// import "../../style/EmployeeRequests.css";
// import SubmitRequestModal from "./SubmitRequestModal";
// import { getMyRequests, withdrawRequest } from "../../services/requestService.js";
// import { toast } from "react-toastify";
// import SvgIcon from "../../components/svgIcon/svgView";

// export default function EmployeeRequests() {
//   const [openModal, setOpenModal] = useState(false);
//   const [requests, setRequests] = useState([]);
//   const [loading, setLoading] = useState(false);

//   /* ----------------------------------
//      LEAVE CONFIG (Denominators)
//   ---------------------------------- */
//   const LEAVE_LIMITS = {
//     "Annual Leave": 30,
//     "Sick Leave": 15,
//     "Unpaid Leave": null // unlimited
//   };

//   useEffect(() => {
//     fetchRequests();
//   }, []);

//   const fetchRequests = async () => {
//     try {
//       setLoading(true);
//       const response = await getMyRequests();
//       if (response.success) {
//         setRequests(response.data || []);
//       }
//     } catch (error) {
//       console.error("Failed to fetch requests:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleWithdraw = async (requestId) => {
//     try {
//       const response = await withdrawRequest(requestId);
//       if (response.success) {
//         toast.success(response.message || "Request withdrawn successfully");
//         fetchRequests();
//       } else {
//         toast.error(response.message || "Failed to withdraw request");
//       }
//     } catch (error) {
//       toast.error(
//         error.response?.data?.message ||
//           error.message ||
//           "Failed to withdraw request"
//       );
//     }
//   };

//   /* ----------------------------------
//      LEAVE USAGE CALCULATION
//   ---------------------------------- */
//   const leaveUsage = useMemo(() => {
//     const usage = {
//       "Annual Leave": 0,
//       "Sick Leave": 0,
//       "Unpaid Leave": 0
//     };

//     requests.forEach((req) => {
//       if (
//         req.requestType === "LEAVE" &&
//         ["PENDING","APPROVED", "COMPLETED"].includes(req.status)
//       ) {
//         const type = req.details?.leaveType;
//         const days = Number(req.details?.numberOfDays || 0);

//         if (usage[type] !== undefined) {
//           usage[type] += days;
//         }
//       }
//     });

//     return usage;
//   }, [requests]);

//   const getProgress = (used, total) => {
//     if (!total) return 0;
//     return Math.min((used / total) * 100, 100);
//   };

//   const formatDate = (dateString) => {
//     if (!dateString) return "";
//     return new Date(dateString).toISOString().split("T")[0];
//   };

//   const getStatusBadge = (status) => {
//     const statusConfig = {
//       PENDING: { label: "Pending", class: "status-pending", icon: <SvgIcon name="circle-tick" size={15} /> },
//       APPROVED: { label: "Approved", class: "status-approved", icon: <SvgIcon name="circle-tick" size={15} /> },
//       REJECTED: { label: "Rejected", class: "status-rejected", icon: <SvgIcon name="circle-xmark" size={15} /> },
//       COMPLETED: { label: "Completed", class: "status-completed", icon: <SvgIcon name="circle-tick" size={15} /> },
//       WITHDRAWN: { label: "Withdrawn", class: "status-withdrawn", icon: <SvgIcon name="arrow-uturn-cw-left" size={15} /> }
//     };
//     const config = statusConfig[status] || statusConfig.PENDING;
//     return (
//       <span className={`status-badge ${config.class}`}>
//         <span className="status-icon">{config.icon}</span>
//         {config.label}
//       </span>
//     );
//   };

//   const getRequestTypeLabel = (request) => {
//     if (request.requestType === "LEAVE") return request.details.leaveType;
//     if (request.requestType === "SALARY") return "Salary Advance";
//     if (request.requestType === "DOCUMENT") return "Document Request";
//     return request.requestType;
//   };

//   const getRequestDetails = (request) => {
//     if (request.requestType === "LEAVE") {
//       const days = request.details.numberOfDays
//         ? ` (${request.details.numberOfDays} days)`
//         : "";
//       return `${request.details.fromDate} to ${request.details.toDate}${days}`;
//     }
//     if (request.requestType === "SALARY") {
//       return `Amount: AED ${request.details.amount}`;
//     }
//     if (request.requestType === "DOCUMENT") {
//       return `Document: ${request.details.documentType}`;
//     }
//     return "";
//   };

//   return (
//     <div className="employee-requests">
//       {/* HEADER */}
//       <div className="requests-header">
//         <div>
//           <h1 className="requests-title">My Requests</h1>
//           <p className="requests-subtitle">Submit and track your requests</p>
//         </div>

//         <button className="new-request-btn" onClick={() => setOpenModal(true)}>
//           <span className="plus">＋</span>
//           New Request
//         </button>
//       </div>

//       {/* LEAVE SUMMARY */}
//       <div className="leave-cards">
//         {Object.keys(LEAVE_LIMITS).map((leaveType) => {
//           const used = leaveUsage[leaveType];
//           const total = LEAVE_LIMITS[leaveType];
//           const progress = getProgress(used, total);

//           return (
//             <div key={leaveType} className="leave-card">
//               <div className="leave-card-header">
//                 <span className="leave-title">{leaveType}</span>
//                 <span className="leave-count">
//                   <strong>{used}</strong>{" "}
//                   {total ? `/ ${total} days` : "days taken"}
//                 </span>
//               </div>

//               <div className="progress-bar">
//                 <div
//                   className={`progress-fill ${
//                     leaveType === "Annual Leave"
//                       ? "blue"
//                       : leaveType === "Sick Leave"
//                       ? "green"
//                       : "gray"
//                   }`}
//                   style={{ width: `${progress}%` }}
//                 />
//                 <div
//                   className="progress-unfilled"
//                   style={{ width: `${100 - progress}%` }}
                
//                 />
//               </div>
//             </div>
//           );
//         })}

//         {openModal && (
//           <SubmitRequestModal
//             onClose={() => setOpenModal(false)}
//             onSuccess={fetchRequests}
//           />
//         )}
//       </div>

//       {/* REQUEST HISTORY */}
//       <div className="request-history-section">
//         <div className="request-history-header">
//           <h2 className="request-history-title">Request History</h2>
//           <p className="request-history-subtitle">
//             Track status of your submitted requests
//           </p>
//         </div>

//         {loading ? (
//           <div className="loading-message">Loading requests...</div>
//         ) : requests.length === 0 ? (
//           <div className="no-requests">No requests submitted yet</div>
//         ) : (
//           <div className="request-list">
//             {requests.map((request) => (
//               <div key={request._id} className="request-item">
//                 <div className="request-item-content">
//                   <div className="request-item-header">
//                     <h3 className="request-item-title">
//                       {getRequestTypeLabel(request)}
//                     </h3>
//                     {getStatusBadge(request.status)}
//                   </div>
//                   <div className="request-item-meta">
//                     Request ID: {request.requestId} • Submitted:{" "}
//                     {formatDate(request.submittedAt)}
//                   </div>
//                   <div className="request-item-details">
//                     {getRequestDetails(request)}
//                   </div>
//                 </div>

//                 <div className="request-item-actions">
//                   {request.status === "PENDING" && (
//                     <button
//                       className="withdraw-btn"
//                       onClick={() => handleWithdraw(request._id)}
//                     >
//                       Withdraw
//                     </button>
//                   )}
//                   <button className="view-details-btn">View Details</button>
//                 </div>
//               </div>
//             ))}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }




import React, { useState, useEffect, useMemo } from "react";
import "../../style/EmployeeRequests.css";
import SubmitRequestModal from "./SubmitRequestModal";
import { getMyRequests, withdrawRequest } from "../../services/requestService.js";
import { toast } from "react-toastify";
import SvgIcon from "../../components/svgIcon/svgView";

/* ----------------------------------
   ✅ STATUS TEXT HELPER (DYNAMIC)
---------------------------------- */
const getStatusText = (req) => {
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
        ["PENDING", "APPROVED", "COMPLETED"].includes(req.status)
      ) {
        const type = req.details?.leaveType;
        const days = Number(req.details?.numberOfDays || 0);

        if (usage[type] !== undefined) {
          usage[type] += days;
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

  const getRequestTypeLabel = (request) => {
    if (request.requestType === "LEAVE") return request.details.leaveType;
    if (request.requestType === "SALARY") return "Salary Advance";
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

      {/* REQUEST HISTORY */}
      <div className="request-history-section">
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

                  {/* ✅ STATUS NOTE ADDED HERE */}
                  {getStatusText(request) && (
                    <div className="request-status-note">
                      {getStatusText(request)}
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

      {openModal && (
        <SubmitRequestModal
          onClose={() => setOpenModal(false)}
          onSuccess={fetchRequests}
        />
      )}
    </div>
  );
}

