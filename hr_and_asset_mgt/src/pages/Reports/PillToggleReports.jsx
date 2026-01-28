import { useState } from "react";
import PrebuiltReports from "./PrebuiltReports";
import CustomReports from "./CustomReports";
import DisposalReport from "./DisposalReport"; // ✅ Import new component
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

        <button
          className={`mode-pill ${activeMode === "disposal" ? "active" : ""}`}
          onClick={() => setActiveMode("disposal")}
        >
          Disposal History
        </button>
      </div>

      {/* White Container */}
      <div className="reports-content-wrapper">
        {activeMode === "prebuilt" && <PrebuiltReports />}
        {activeMode === "disposal" && <DisposalReport />}
        {activeMode === "custom" && <CustomReports />}
      </div>

    </div>
  );
}
