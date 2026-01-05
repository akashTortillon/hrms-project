import { useState } from "react";
import PrebuiltReports from "./PrebuiltReports";
import CustomReports from "./CustomReports";
import "../../style/Reports.css";

export default function ReportsPill() {
  const [activeMode, setActiveMode] = useState("prebuilt");

  return (
    <div className="reports-page">

      {/* Top Pill Buttons */}
      <div className="reports-mode-toggle">
        <button
          className={`mode-pill ${activeMode === "prebuilt" ? "active" : ""}`}
          onClick={() => setActiveMode("prebuilt")}
        >
          Prebuilt Reports
        </button>

        <button
          className={`mode-pill ${activeMode === "custom" ? "active" : ""}`}
          onClick={() => setActiveMode("custom")}
        >
          Custom Reports
        </button>
      </div>

      {/* White Container */}
      <div className="reports-content-wrapper">
        {activeMode === "prebuilt" && <PrebuiltReports />}
        {activeMode === "custom" && <CustomReports />}
      </div>

    </div>
  );
}
