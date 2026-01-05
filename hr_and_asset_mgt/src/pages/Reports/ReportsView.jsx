

import  React from "react";
import ReportsOverview from "./ReportsAtionCards";
import ReportsPill from "./PillToggleReports";
import ComplianceExports from "./ComplianceExports";

function Reports(){
    return <div>
        <ReportsOverview />
        <ReportsPill />
        <ComplianceExports/>
        </div>
}   

export default Reports;