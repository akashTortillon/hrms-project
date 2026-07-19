
import { useState } from "react";
import SvgIcon from "../../components/svgIcon/svgView";
import CustomModal from "../../components/reusable/CustomModal.jsx";
import CustomButton from "../../components/reusable/Button.jsx";
import "../../style/Payroll.css";

export default function PayrollStatus({ onGenerate, onFinalize, loading, status = 0 }) {
  // 0 = Draft (Generate), 1 = Processing, 2 = Completed
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const handleAction = () => {
    if (status === 0) onGenerate();
    if (status === 1) setShowConfirm(true);
  };

  const handleConfirmFinalize = () => {
    setShowConfirm(false);
    setConfirmText("");
    onFinalize();
  };

  const handleCancelConfirm = () => {
    setShowConfirm(false);
    setConfirmText("");
  };

  const buttonConfig = () => {
    if (status === 0) {
      return {
        text: loading ? "Generating..." : "Generate Payroll",
        className: "status-btn primary",
        disabled: loading
      };
    }
    if (status === 1) {
      return {
        text: "Finalize Payroll",
        className: "status-btn success",
      };
    }
    return {
      text: "Completed",
      className: "status-btn completed",
      icon: "circle-tick",
      disabled: true
    };
  };

  const btn = buttonConfig();

  return (
    <div className="payroll-status-card">
      {/* Header */}
      <div className="payroll-status-header">
        <div>
          <h3 className="payroll-status-title">Payroll Status</h3>
          <p className="payroll-status-subtitle" style={{fontSize:"13px"}}>
            Current processing status for Jan 2026
          </p>
        </div>

        <button
          className={btn.className}
          onClick={handleAction}
          disabled={btn.disabled}
        >
          {btn.icon && <SvgIcon name={btn.icon} size={16} />}
          {btn.text}
        </button>
      </div>

      {/* Stepper */}
      <div className="payroll-stepper">
        {/* Step 1 */}
        <div className={`step ${status >= 0 ? "active" : ""}`}>
          <span className="step-circle">1</span>
          <span className="step-label">Draft</span>
        </div>

        <div className={`step-line ${status >= 1 ? "active" : ""}`} />

        {/* Step 2 */}
        <div className={`step ${status >= 1 ? "active" : ""}`}>
          <span className="step-circle">2</span>
          <span className="step-label">Processing</span>
        </div>

        <div className={`step-line ${status >= 2 ? "completed" : ""}`} />

        {/* Step 3 */}
        <div className={`step ${status === 2 ? "completed" : ""}`}>
          <span className="step-circle">3</span>
          <span className="step-label">Completed</span>
        </div>
      </div>

      <CustomModal
        show={showConfirm}
        title="Finalize Payroll"
        onClose={handleCancelConfirm}
        footer={
          <>
            <CustomButton variant="secondary" onClick={handleCancelConfirm} className="bg-gray-200 text-gray-700 hover:bg-gray-300">
              Cancel
            </CustomButton>
            <CustomButton onClick={handleConfirmFinalize} disabled={confirmText.trim().toLowerCase() !== "yes"}>
              Finalize Payroll
            </CustomButton>
          </>
        }
      >
        <p style={{ marginBottom: "12px", color: "#374151" }}>
          This locks payroll for this period. It cannot be undone from here — loan and advance
          requests will be updated and no further edits will be possible.
        </p>
        <label style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "6px" }}>
          Type <strong>Yes</strong> to confirm
        </label>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="Yes"
          style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "14px" }}
          autoFocus
        />
      </CustomModal>
    </div>
  );
}
