import React from "react";
import ReportsOverview from "./ReportsAtionCards";
import ReportsPill from "./PillToggleReports";
import ComplianceExports from "./ComplianceExports";

export default function ReportsView(){
    return <div>
        <ReportsOverview />
        <ReportsPill />
        <ComplianceExports />
    </div>
}