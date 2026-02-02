
import { useState } from "react";
import SvgIcon from "../../components/svgIcon/svgView";
import "../../style/Payroll.css";

export default function PayrollStatus({ onGenerate, onFinalize, loading, status = 0 }) {
  // 0 = Draft (Generate), 1 = Processing, 2 = Completed

  const handleAction = () => {
    if (status === 0) onGenerate();
    if (status === 1) onFinalize();
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
    </div>
  );
}
