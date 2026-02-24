import { useState, useEffect } from "react";
import "../../style/SubmitRequestModal.css";

import SvgIcon from "../../components/svgIcon/svgView";
import { createRequest } from "../../services/requestService.js";
import { leaveTypeService } from "../../services/masterService.js"; // ✅ Import leaveTypeService
import { toast } from "react-toastify";
import CustomSelect from "../../components/reusable/CustomSelect.jsx";
import CustomDatePicker from "../../components/reusable/CustomDatePicker.jsx";


export default function SubmitRequestModal({ onClose, onSuccess }) {
  const [activeType, setActiveType] = useState("leave");
  const [loading, setLoading] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState([]); // ✅ Leave types state

  //-----------------------------------------------------------------------------------------------------------------------
  // ✅ SubType state for Salary requests
  const [salarySubType, setSalarySubType] = useState("salary_advance");

  // ✅ HALF-DAY: Session state (only relevant when isHalfDay is true)
  const [halfDaySession, setHalfDaySession] = useState("");

  // Form states
  const [leaveForm, setLeaveForm] = useState({
    leaveType: "", // Changed from "Annual Leave" to ""
    leaveTypeId: "", // ✅ Track ID
    isPaid: true,    // ✅ Track Paid status
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

  // ✅ HALF-DAY: Detect if selected leave type is "Half Day"
  const isHalfDay = leaveForm.leaveType === "Half Day";

  // ✅ Fetch Leave Types
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

  // ✅ HALF-DAY: When isHalfDay changes, auto-adjust form fields
  useEffect(() => {
    if (isHalfDay) {
      // Auto-sync toDate = fromDate and lock numberOfDays to 0.5
      setLeaveForm(prev => ({
        ...prev,
        toDate: prev.fromDate,
        numberOfDays: "0.5"
      }));
    } else {
      // Restore editable fields when switching back to full-day
      setHalfDaySession("");
      setLeaveForm(prev => ({
        ...prev,
        numberOfDays: "",
        toDate: ""
      }));
    }
  }, [isHalfDay]); // eslint-disable-line react-hooks/exhaustive-deps

  // ✅ HALF-DAY: Keep toDate in sync with fromDate for half-day leaves
  const handleFromDateChange = (e) => {
    const newDate = e.target.value;
    if (isHalfDay) {
      setLeaveForm({ ...leaveForm, fromDate: newDate, toDate: newDate });
    } else {
      setLeaveForm({ ...leaveForm, fromDate: newDate });
    }
  };

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

        // ✅ HALF-DAY: Additional validation
        if (isHalfDay) {
          if (!halfDaySession) {
            toast.error("Please select a half-day session (First Half or Second Half)");
            setLoading(false);
            return;
          }
          if (leaveForm.fromDate !== leaveForm.toDate) {
            toast.error("Half-day leave must be on a single day");
            setLoading(false);
            return;
          }
        }

        requestData.details = {
          leaveType: leaveForm.leaveType,
          leaveTypeId: leaveForm.leaveTypeId,    // ✅
          isPaid: leaveForm.isPaid,               // ✅
          leaveDuration: isHalfDay ? "HALF_DAY" : "FULL_DAY",   // ✅ HALF-DAY
          ...(isHalfDay && { halfDaySession }),                   // ✅ HALF-DAY: only when half-day
          numberOfDays: isHalfDay ? 0.5 : leaveForm.numberOfDays,
          fromDate: leaveForm.fromDate,
          toDate: isHalfDay ? leaveForm.fromDate : leaveForm.toDate, // ✅ HALF-DAY: toDate = fromDate
          reason: leaveForm.reason
        };
      } else if (activeType === "salary") {
        if (!salaryForm.amount || !salaryForm.reason) {
          toast.error("Please fill all required fields");
          setLoading(false);
          return;
        }
        // ✅ Include subType for salary requests
        requestData.subType = salarySubType;
        requestData.details = {
          amount: salaryForm.amount,
          repaymentPeriod: salaryForm.repaymentPeriod,
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
        setHalfDaySession(""); // ✅ HALF-DAY: reset session
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
                <CustomSelect
                  name="leaveTypeId"
                  placeholder="Select Leave Type"
                  value={leaveForm.leaveTypeId}
                  options={leaveTypes.map(type => ({
                    value: type._id,
                    label: `${type.name} ${type.metadata?.isPaid === false ? "(Unpaid)" : "(Paid)"}`
                  }))}
                  onChange={(val) => {
                    const selected = leaveTypes.find(t => t._id === val);
                    if (selected) {
                      setLeaveForm({
                        ...leaveForm,
                        leaveTypeId: selected._id,
                        leaveType: selected.name,
                        isPaid: selected.metadata?.isPaid !== false
                      });
                      // ✅ HALF-DAY: clear session when leave type changes
                      setHalfDaySession("");
                    }
                  }}
                />

              </div>

              <div>
                <label>Number of Days</label>
                {/* ✅ HALF-DAY: Show read-only 0.5 when half-day, otherwise normal input */}
                {isHalfDay ? (
                  <input
                    type="number"
                    value="0.5"
                    readOnly
                    style={{ backgroundColor: "#f5f5f5", cursor: "not-allowed" }}
                    title="Half-day leave is fixed at 0.5 days"
                  />
                ) : (
                  <input
                    type="number"
                    placeholder="5"
                    value={leaveForm.numberOfDays}
                    onChange={(e) =>
                      setLeaveForm({ ...leaveForm, numberOfDays: e.target.value })
                    }
                  />
                )}
              </div>
            </div>

            <div className="form-row">
              <div>
                <label>From Date</label>
                <CustomDatePicker
                  name="fromDate"
                  value={leaveForm.fromDate}
                  placeholder="From Date"
                  onChange={handleFromDateChange}
                />
              </div>

              <div>
                <label>To Date</label>
                {/* ✅ HALF-DAY: Show read-only auto-synced date when half-day */}
                {isHalfDay ? (
                  <CustomDatePicker
                    name="toDate"
                    value={leaveForm.fromDate}
                    placeholder="To Date"
                    disabled={true}
                    onChange={() => { }} // no-op: locked for half-day
                  />
                ) : (
                  <CustomDatePicker
                    name="toDate"
                    value={leaveForm.toDate}
                    placeholder="To Date"
                    onChange={(e) =>
                      setLeaveForm({ ...leaveForm, toDate: e.target.value })
                    }
                  />
                )}
              </div>
            </div>

            {/* ✅ HALF-DAY: Session selector — only shown when Half Day is selected */}
            {isHalfDay && (
              <div className="form-row">
                <div style={{ width: "100%" }}>
                  <label>Half Day Session <span style={{ color: "red" }}>*</span></label>
                  <CustomSelect
                    name="halfDaySession"
                    placeholder="Select Session"
                    value={halfDaySession}
                    options={[
                      { value: "FIRST_HALF", label: "First Half (Morning)" },
                      { value: "SECOND_HALF", label: "Second Half (Afternoon)" }
                    ]}
                    onChange={(val) => setHalfDaySession(val)}
                  />
                  {!halfDaySession && (
                    <small style={{ color: "#e57373", fontSize: "12px", marginTop: "4px", display: "block" }}>
                      Please select which half of the day you are taking off
                    </small>
                  )}
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
            {/* ✅ RADIO BUTTONS FOR SUB-TYPE */}
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

            <div>
              <label>Repayment Period (Months)</label>
              <CustomSelect
                placeholder="Select Period"
                value={salaryForm.repaymentPeriod}
                options={[
                  { value: "3 Months", label: "3 Months" },
                  { value: "6 Months", label: "6 Months" },
                  { value: "9 Months", label: "9 Months" }
                ]}
                onChange={(val) =>
                  setSalaryForm({
                    ...salaryForm,
                    repaymentPeriod: val
                  })
                }
              />
            </div>

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
              <CustomSelect
                placeholder="Select Document Type"
                value={documentForm.documentType}
                options={[
                  { value: "Salary Certificate", label: "Salary Certificate" },
                  { value: "Experience Letter", label: "Experience Letter" },
                  { value: "Employment Letter", label: "Employment Letter" },
                  {
                    value: "NOC (No Objection Certificate)",
                    label: "NOC (No Objection Certificate)"
                  }
                ]}
                onChange={(val) =>
                  setDocumentForm({
                    ...documentForm,
                    documentType: val
                  })
                }
              />
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