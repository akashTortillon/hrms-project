import { useState, useEffect } from "react";
import "../../style/SubmitRequestModal.css";

import SvgIcon from "../../components/svgIcon/svgView";
import { createRequest } from "../../services/requestService.js";
import { leaveTypeService } from "../../services/masterService.js"; // ✅ Import leaveTypeService
import { toast } from "react-toastify";

export default function SubmitRequestModal({ onClose, onSuccess }) {
  const [activeType, setActiveType] = useState("leave");
  const [loading, setLoading] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState([]); // ✅ NEW: Leave types state

  // ✅ NEW: SubType state for Salary requests
  const [salarySubType, setSalarySubType] = useState("salary_advance");

  // Form states
  const [leaveForm, setLeaveForm] = useState({
    leaveType: "", // Changed from "Annual Leave" to ""
    leaveTypeId: "", // ✅ NEW: Track ID
    isPaid: true,    // ✅ NEW: Track Paid status
    numberOfDays: "",
    fromDate: "",
    toDate: "",
    reason: ""
  });

  const [salaryForm, setSalaryForm] = useState({
    amount: "",
    repaymentPeriod: "3 Months",
    reason: ""
  });

  const [documentForm, setDocumentForm] = useState({
    documentType: "Salary Certificate",
    purpose: ""
  });

  // ✅ NEW: Fetch Leave Types
  useEffect(() => {
    const fetchLeaveTypes = async () => {
      try {
        const data = await leaveTypeService.getAll();
        setLeaveTypes(data);
        if (data.length > 0) {
          setLeaveForm(prev => ({
            ...prev,
            leaveType: data[0].name,
            leaveTypeId: data[0]._id,
            isPaid: data[0].metadata?.isPaid !== false // Default to true if not specified
          }));
        }
      } catch (error) {
        console.error("Failed to fetch leave types:", error);
      }
    };
    fetchLeaveTypes();
  }, []);

  const handleSubmit = async () => {
    try {
      setLoading(true);

      let requestData = {
        requestType: activeType.toUpperCase(),
        details: {}
      };

      // Prepare details based on request type
      if (activeType === "leave") {
        if (!leaveForm.fromDate || !leaveForm.toDate || !leaveForm.reason) {
          toast.error("Please fill all required fields");
          setLoading(false);
          return;
        }
        requestData.details = {
          leaveType: leaveForm.leaveType,
          leaveTypeId: leaveForm.leaveTypeId, // ✅ NEW
          isPaid: leaveForm.isPaid,           // ✅ NEW
          numberOfDays: leaveForm.numberOfDays,
          fromDate: leaveForm.fromDate,
          toDate: leaveForm.toDate,
          reason: leaveForm.reason
        };
      } else if (activeType === "salary") {
        if (!salaryForm.amount || !salaryForm.reason) {
          toast.error("Please fill all required fields");
          setLoading(false);
          return;
        }
        // ✅ NEW: Include subType for salary requests
        requestData.subType = salarySubType;
        requestData.details = {
          amount: salaryForm.amount,
          repaymentPeriod: salarySubType === "salary_advance" ? "1 Month" : salaryForm.repaymentPeriod,
          reason: salaryForm.reason
        };
      } else if (activeType === "document") {
        if (!documentForm.purpose) {
          toast.error("Please fill all required fields");
          setLoading(false);
          return;
        }
        requestData.details = {
          documentType: documentForm.documentType,
          purpose: documentForm.purpose
        };
      }

      const response = await createRequest(requestData);

      if (response.success) {
        toast.success(response.message || "Request submitted successfully");
        // Reset forms
        setLeaveForm({
          leaveType: leaveTypes.length > 0 ? leaveTypes[0].name : "",
          leaveTypeId: leaveTypes.length > 0 ? leaveTypes[0]._id : "",
          isPaid: leaveTypes.length > 0 ? (leaveTypes[0].metadata?.isPaid !== false) : true,
          numberOfDays: "",
          fromDate: "",
          toDate: "",
          reason: ""
        });
        setSalaryForm({
          amount: "",
          repaymentPeriod: "3 Months",
          reason: ""
        });
        setDocumentForm({
          documentType: "Salary Certificate",
          purpose: ""
        });
        setActiveType("leave");
        setSalarySubType("salary_advance"); // Reset subType
        onClose();
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast.error(response.message || "Failed to submit request");
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to submit request";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="request-modal-overlay" onClick={onClose}>
      <div
        className="request-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="modal-header">
          <h2>Submit New Request</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* REQUEST TYPE CARDS */}
        <div className="request-type-grid">
          <div
            className={`request-type-card ${activeType === "leave" ? "active" : ""
              }`}
            onClick={() => setActiveType("leave")}
          >
            <div className="icon blue"><SvgIcon name="calendar" /></div>
            <p>Leave Request</p>
          </div>

          <div
            className={`request-type-card ${activeType === "salary" ? "active" : ""
              }`}
            onClick={() => setActiveType("salary")}
          >
            <div className="icon green"><SvgIcon name="dollar" /></div>
            <p>Salary Advance</p>
          </div>

          <div
            className={`request-type-card ${activeType === "document" ? "active" : ""
              }`}
            onClick={() => setActiveType("document")}
          >
            <div className="icon purple"><SvgIcon name="document" /></div>
            <p>Document Request</p>
          </div>
        </div>

        {/* ================= FORMS ================= */}

        {/* LEAVE REQUEST FORM */}
        {activeType === "leave" && (
          <div className="leave-form">
            <div className="form-row">
              <div>
                <label>Leave Type</label>
                <select
                  name="leaveTypeId"
                  value={leaveForm.leaveTypeId}
                  onChange={(e) => {
                    const val = e.target.value;
                    const selected = leaveTypes.find(t => t._id === val);
                    if (selected) {
                      setLeaveForm({
                        ...leaveForm,
                        leaveTypeId: selected._id,
                        leaveType: selected.name,
                        isPaid: selected.metadata?.isPaid !== false
                      });
                    }
                  }}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    backgroundColor: "white",
                    fontSize: "14px",
                    height: "42px"
                  }}
                >
                  <option value="" disabled>Select Leave Type</option>
                  {leaveTypes.map(type => (
                    <option key={type._id} value={type._id}>
                      {`${type.name} ${type.metadata?.isPaid === false ? "(Unpaid)" : "(Paid)"}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>Number of Days</label>
                <input
                  type="number"
                  placeholder="5"
                  value={leaveForm.numberOfDays}
                  onChange={(e) =>
                    setLeaveForm({ ...leaveForm, numberOfDays: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="form-row">
              <div>
                <label>From Date</label>
                <input
                  type="date"
                  value={leaveForm.fromDate}
                  onChange={(e) =>
                    setLeaveForm({ ...leaveForm, fromDate: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                    height: "42px"
                  }}
                />
              </div>

              <div>
                <label>To Date</label>
                <input
                  type="date"
                  value={leaveForm.toDate}
                  onChange={(e) =>
                    setLeaveForm({ ...leaveForm, toDate: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                    height: "42px"
                  }}
                />
              </div>
            </div>

            <div>
              <label>Reason</label>
              <textarea
                placeholder="Enter reason for leave..."
                value={leaveForm.reason}
                onChange={(e) =>
                  setLeaveForm({ ...leaveForm, reason: e.target.value })
                }
              />
            </div>
          </div>
        )}

        {/* SALARY ADVANCE FORM */}
        {activeType === "salary" && (
          <div className="leave-form">
            {/* ✅ NEW: RADIO BUTTONS FOR SUB-TYPE */}
            <div className="salary-subtype-section">
              <label className="subtype-label">Request Type</label>
              <div className="radio-group">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="salarySubType"
                    value="salary_advance"
                    checked={salarySubType === "salary_advance"}
                    onChange={(e) => setSalarySubType(e.target.value)}
                  />
                  <span className="radio-text">Salary Advance</span>
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="salarySubType"
                    value="loan"
                    checked={salarySubType === "loan"}
                    onChange={(e) => setSalarySubType(e.target.value)}
                  />
                  <span className="radio-text">Loan Application</span>
                </label>
              </div>
            </div>

            <div>
              <label>Request Amount (AED)</label>
              <input
                type="number"
                placeholder="3000"
                value={salaryForm.amount}
                onChange={(e) =>
                  setSalaryForm({ ...salaryForm, amount: e.target.value })
                }
              />
            </div>

            {salarySubType === "loan" && (
              <div>
                <label>Repayment Period (Months)</label>
                <select
                  value={salaryForm.repaymentPeriod}
                  onChange={(e) =>
                    setSalaryForm({
                      ...salaryForm,
                      repaymentPeriod: e.target.value
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    backgroundColor: "white",
                    fontSize: "14px",
                    height: "42px"
                  }}
                >
                  <option value="" disabled>Select Period</option>
                  <option value="3 Months">3 Months</option>
                  <option value="6 Months">6 Months</option>
                  <option value="9 Months">9 Months</option>
                </select>
              </div>
            )}

            <div>
              <label>Reason</label>
              <textarea
                placeholder={`Enter reason for ${salarySubType === "loan" ? "loan" : "salary advance"}...`}
                value={salaryForm.reason}
                onChange={(e) =>
                  setSalaryForm({ ...salaryForm, reason: e.target.value })
                }
              />
            </div>
          </div>
        )}

        {/* DOCUMENT REQUEST FORM */}
        {activeType === "document" && (
          <div className="leave-form">
            <div>
              <label>Document Type</label>
              <label>Document Type</label>
              <select
                value={documentForm.documentType}
                onChange={(e) =>
                  setDocumentForm({
                    ...documentForm,
                    documentType: e.target.value
                  })
                }
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  backgroundColor: "white",
                  fontSize: "14px",
                  height: "42px"
                }}
              >
                <option value="" disabled>Select Document Type</option>
                <option value="Salary Certificate">Salary Certificate</option>
                <option value="Experience Letter">Experience Letter</option>
                <option value="Employment Letter">Employment Letter</option>
                <option value="NOC (No Objection Certificate)">NOC (No Objection Certificate)</option>
              </select>
            </div>

            <div>
              <label>Purpose</label>
              <textarea
                placeholder="Enter purpose of document request..."
                value={documentForm.purpose}
                onChange={(e) =>
                  setDocumentForm({ ...documentForm, purpose: e.target.value })
                }
              />
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div className="modal-footer">
          <button
            className="submit-btn"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Submitting..." : "Submit Request"}
          </button>
          <button className="cancel-btn" onClick={onClose} disabled={loading}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}