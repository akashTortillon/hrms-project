import { useState } from "react";
import SvgIcon from "../../components/svgIcon/svgView.jsx";
import AppButton from "../../components/reusable/Button";
import "../../style/Attendance.css";

export default function AttendanceHeader({ viewMode, setViewMode, onSync, loading }) {
  return (
    <div className="attendance-header">
      <div className="attendance-header-left">
        <h2 className="attendance-title">Attendance Tracking</h2>
        <p className="attendance-subtitle">
          Monitor employee attendance and shift management
        </p>

        <div className="attendance-tabs">
          <AppButton
            className={`attendance-action-btn ${viewMode === "day" ? "is-active" : ""}`}
            onClick={() => setViewMode("day")}
          >
            Daily View
          </AppButton>

          <AppButton
            className={`attendance-action-btn ${viewMode === "month" ? "is-active" : ""}`}
            onClick={() => setViewMode("month")}
          >
            Monthly View
          </AppButton>
        </div>
      </div>

      <div className="attendance-header-actions">
        <AppButton
          variant="primary"
          className="btn-outline-custom"
          onClick={onSync}
          disabled={loading}
        >
          {loading ? "Syncing..." : "Sync Biometric"}
        </AppButton>

        <AppButton variant="primary">
          <SvgIcon name="download" size={16} />
          <span>Export Report</span>
        </AppButton>
      </div>
    </div>
  );
}
