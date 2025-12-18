import { useState } from "react";
import SvgIcon from "../../components/svgIcon/svgView.jsx";
import AppButton from "../../components/reusable/Button";
import "../../style/Attendance.css";

export default function AttendanceHeader() {
  const [view, setView] = useState("daily");

  return (
    <div className="attendance-header">
      <div className="attendance-header-left">
        <h2 className="attendance-title">Attendance Tracking</h2>
        <p className="attendance-subtitle">
          Monitor employee attendance and shift management
        </p>

        <div className="attendance-tabs">
          <AppButton
            className={`attendance-action-btn ${view === "daily" ? "is-active" : ""}`}
            onClick={() => setView("daily")}
          >
            Daily View
          </AppButton>

          <AppButton
            className={`attendance-action-btn ${view === "monthly" ? "is-active" : ""}`}
            onClick={() => setView("monthly")}
          >
            Monthly View
          </AppButton>
        </div>
      </div>

      <div className="attendance-header-actions">
        <AppButton variant="primary" className="btn-outline-custom">
          Sync Biometric
        </AppButton>

        <AppButton variant="primary">
          <SvgIcon name="download" size={16} />
          <span>Export Report</span>
        </AppButton>
      </div>
    </div>
  );
}
