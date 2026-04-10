import { useState, useEffect } from "react";
import "../../style/SubmitRequestModal.css";

import SvgIcon from "../../components/svgIcon/svgView";
import { createRequest } from "../../services/requestService.js";
import { leaveTypeService, repaymentPeriodService } from "../../services/masterService.js"; // ✅ Import leaveTypeService
import { toast } from "react-toastify";

export default function SubmitRequestModal({ onClose, onSuccess }) {
  const [activeType, setActiveType] = useState("leave");
  const [loading, setLoading] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState([]); // ✅ NEW: Leave types state
  const [repaymentPeriods, setRepaymentPeriods] = useState([]);
  const [medicalFile, setMedicalFile] = useState(null);

  // ✅ NEW: SubType state for Salary requests
  const [salarySubType, setSalarySubType] = useState("salary_advance");

  // Form states
  const [leaveForm, setLeaveForm] = useState({
    leaveType: "", // Changed from "Annual Leave" to ""
    leaveTypeId: "", // ✅ NEW: Track ID
    isPaid: true,    // ✅ NEW: Track Paid status
    isHalfDay: false, // ✅ NEW: Track half-day
    numberOfDays: "",
    fromDate: "",
    toDate: "",
    reason: ""
  });

  const [salaryForm, setSalaryForm] = useState({
    amount: "",
    repaymentPeriod: "",
    reason: ""
  });

  const fallbackRepaymentPeriods = [
    { _id: "fallback-1", name: "1 Month", metadata: { months: 1 } },
    { _id: "fallback-3", name: "3 Months", metadata: { months: 3 } },
    { _id: "fallback-6", name: "6 Months", metadata: { months: 6 } },
    { _id: "fallback-12", name: "12 Months", metadata: { months: 12 } }
  ];

  const repaymentPeriodOptions = repaymentPeriods.length > 0 ? repaymentPeriods : fallbackRepaymentPeriods;
  const getRepaymentMonths = (period) => {
    const months = Number(period.metadata?.months ?? period.value ?? parseInt(period.name, 10));
    return Number.isFinite(months) && months > 0 ? months : 1;
  };

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

  useEffect(() => {
    const fetchRepaymentPeriods = async () => {
      try {
        const data = await repaymentPeriodService.getAll();
        const periods = Array.isArray(data) ? data : [];
        setRepaymentPeriods(periods);
        const firstPeriod = periods[0] || fallbackRepaymentPeriods[1];
        setSalaryForm(prev => ({
          ...prev,
          repaymentPeriod: String(getRepaymentMonths(firstPeriod))
        }));
      } catch (error) {
        console.error("Failed to fetch repayment periods:", error);
        setRepaymentPeriods([]);
        setSalaryForm(prev => ({
          ...prev,
          repaymentPeriod: String(getRepaymentMonths(fallbackRepaymentPeriods[1]))
        }));
      }
    };
    fetchRepaymentPeriods();
  }, []);

  const handleSubmit = async () => {
    try {
      setLoading(true);

      let requestData;

      // Prepare details based on request type
      if (activeType === "leave") {
        if (!leaveForm.fromDate || !leaveForm.toDate || !leaveForm.reason) {
          toast.error("Please fill all required fields");
          setLoading(false);
          return;
        }
        const leaveDetails = {
          leaveType: leaveForm.leaveType,
          leaveTypeId: leaveForm.leaveTypeId, // ✅ NEW
          isPaid: leaveForm.isPaid,           // ✅ NEW
          isHalfDay: leaveForm.isHalfDay,     // ✅ NEW
          numberOfDays: leaveForm.isHalfDay ? 0.5 : leaveForm.numberOfDays,
          fromDate: leaveForm.fromDate,
          toDate: leaveForm.isHalfDay ? leaveForm.fromDate : leaveForm.toDate,
          reason: leaveForm.reason
        };
        requestData = new FormData();
        requestData.append("requestType", "LEAVE");
        requestData.append("details", JSON.stringify(leaveDetails));
        if (medicalFile) {
          requestData.append("document", medicalFile);
        }
      } else if (activeType === "salary") {
        if (!salaryForm.amount || !salaryForm.reason) {
          toast.error("Please fill all required fields");
          setLoading(false);
          return;
        }
        // ✅ NEW: Include subType for salary requests
        requestData = {
          requestType: "SALARY",
          subType: salarySubType,
          details: {
          amount: salaryForm.amount,
          repaymentPeriod: salarySubType === "salary_advance" ? "1" : salaryForm.repaymentPeriod,
          reason: salaryForm.reason
          }
        };
      } else if (activeType === "document") {
        if (!documentForm.purpose) {
          toast.error("Please fill all required fields");
          setLoading(false);
          return;
        }
        requestData = {
          requestType: "DOCUMENT",
          details: {
          documentType: documentForm.documentType,
          purpose: documentForm.purpose
          }
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
          isHalfDay: false,
          numberOfDays: "",
          fromDate: "",
          toDate: "",
          reason: ""
        });
        setSalaryForm({
          amount: "",
          repaymentPeriod: String(getRepaymentMonths(repaymentPeriodOptions[0] || fallbackRepaymentPeriods[1])),
          reason: ""
        });
        setDocumentForm({
          documentType: "Salary Certificate",
          purpose: ""
        });
        setActiveType("leave");
        setSalarySubType("salary_advance"); // Reset subType
        setMedicalFile(null);
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
                  value={leaveForm.isHalfDay ? "0.5" : leaveForm.numberOfDays}
                  disabled={leaveForm.isHalfDay}
                  onChange={(e) => {
                    const days = parseInt(e.target.value, 10);
                    if (!isNaN(days) && days > 0 && leaveForm.fromDate) {
                      const from = new Date(leaveForm.fromDate);
                      from.setDate(from.getDate() + days - 1);
                      const toDate = from.toISOString().split('T')[0];
                      setLeaveForm({ ...leaveForm, numberOfDays: e.target.value, toDate });
                    } else {
                      setLeaveForm({ ...leaveForm, numberOfDays: e.target.value });
                    }
                  }}
                />
              </div>
            </div>

            <div className="form-row" style={{ alignItems: "center" }}>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <input
                  type="checkbox"
                  id="isHalfDay"
                  checked={leaveForm.isHalfDay}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setLeaveForm({
                      ...leaveForm,
                      isHalfDay: checked,
                      // If half day enabled and fromDate is set, sync toDate
                      toDate: (checked && leaveForm.fromDate) ? leaveForm.fromDate : leaveForm.toDate
                    });
                  }}
                  style={{ width: "16px", height: "16px" }}
                />
                <label htmlFor="isHalfDay" style={{ margin: 0, cursor: "pointer", fontWeight: "bold" }}>Request Half-Day Only?</label>
              </div>
            </div>

            <div className="form-row">
              <div>
                <label>From Date</label>
                <input
                  type="date"
                  value={leaveForm.fromDate}
                  onChange={(e) => {
                    const from = e.target.value;
                    let toDate = leaveForm.isHalfDay ? from : leaveForm.toDate;
                    // Auto-calc toDate if numberOfDays is already set
                    if (!leaveForm.isHalfDay && leaveForm.numberOfDays && parseInt(leaveForm.numberOfDays) > 0) {
                      const d = new Date(from);
                      d.setDate(d.getDate() + parseInt(leaveForm.numberOfDays) - 1);
                      toDate = d.toISOString().split('T')[0];
                    }
                    setLeaveForm({ ...leaveForm, fromDate: from, toDate });
                  }}
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
                  value={leaveForm.isHalfDay ? leaveForm.fromDate : leaveForm.toDate}
                  disabled={leaveForm.isHalfDay}
                  onChange={(e) => {
                    const toDate = e.target.value;
                    // Auto-calc numberOfDays from date range
                    let days = leaveForm.numberOfDays;
                    if (leaveForm.fromDate && toDate) {
                      const diff = Math.floor((new Date(toDate) - new Date(leaveForm.fromDate)) / 86400000) + 1;
                      if (diff > 0) days = String(diff);
                    }
                    setLeaveForm({ ...leaveForm, toDate, numberOfDays: days });
                  }}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                    height: "42px",
                    backgroundColor: leaveForm.isHalfDay ? "#f3f4f6" : "white"
                  }}
                />
              </div>
            </div>

            {String(leaveForm.leaveType || "").toLowerCase().includes("sick") && (
              <div className="form-row">
                <div>
                  <label>Medical Document</label>
                  <input
                    type="file"
                    onChange={(e) => setMedicalFile(e.target.files?.[0] || null)}
                    style={{ width: "100%" }}
                  />
                  <small style={{ color: "#6b7280" }}>
                    Required for more than 1 consecutive sick-leave day. If not uploaded, leave becomes unpaid from day 2.
                  </small>
                </div>
              </div>
            )}

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
                  {repaymentPeriodOptions.map((period) => {
                    const months = getRepaymentMonths(period);
                    return (
                      <option key={period._id || period.name} value={months}>
                        {period.name || `${months} Month${months > 1 ? "s" : ""}`}
                      </option>
                    );
                  })}
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
                <option value="Employment Certificate">Employment Certificate</option>
                <option value="Bonafide Certificate">Bonafide Certificate</option>
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
