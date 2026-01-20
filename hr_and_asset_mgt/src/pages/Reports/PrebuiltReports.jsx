import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

import SvgIcon from "../../components/svgIcon/svgView";
import Card from "../../components/reusable/Card";
import Button from "../../components/reusable/Button";
import ScheduledReports from "./ScheduledReports";

import "../../style/Reports.css";

const TABS = ["All", "HR", "Payroll", "Assets", "Documents", "Compliance"];

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

export default function PrebuiltReports() {
  const [activeTab, setActiveTab] = useState("HR");
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [error, setError] = useState(null);

  /** 🔁 Report Mode */
  const [mode, setMode] = useState("daily"); // daily | monthly

  /** 📅 Date / Month / Year */
  const today = new Date().toISOString().split("T")[0];
  const currentDate = new Date();

  const [date, setDate] = useState(today);
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());

  const handleGenerateDepartmentAttendance = async () => {
    if (loading) return;

    try {
      setLoading(true);
      setError(null);
      setReportData([]);

      toast.info("Generating departmental attendance report...");

      let url = "";

      if (mode === "daily") {
        if (!date) {
          toast.error("Please select a date");
          return;
        }
        url = `/api/reports/department-attendance/daily?date=${date}`;
      }

      if (mode === "monthly") {
        if (!month || !year) {
          toast.error("Please select month and year");
          return;
        }
        url = `/api/reports/department-attendance?month=${month}&year=${year}`;
      }

      const response = await axios.get(url);

      if (response.data.success) {
        const data = response.data.data || [];

        if (!data.length) {
          toast.warning("No attendance data found for selected period");
        } else {
          toast.success("Report generated successfully");
        }

        setReportData(data);
      } else {
        toast.error("Failed to generate report");
        setError("Failed to generate report");
      }
    } catch (err) {
      console.error("Department Attendance Error:", err);
      toast.error(
        err.response?.data?.message || "Error generating attendance report"
      );
      setError("Error generating report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="prebuilt-reports">
      {/* Tabs */}
      <div className="report-tabs">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`report-tab ${activeTab === tab ? "active" : ""}`}
            onClick={() => {
              setActiveTab(tab);
              setReportData([]);
              setError(null);
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {(activeTab === "HR" || activeTab === "All") && (
        <div className="reports-grid">
          <Card className="report-card">
            <div className="report-card-header">
              <div className="report-icon">
                <SvgIcon name="calendar" size={22} />
              </div>
              <span className="report-tag">HR</span>
            </div>

            <h4 className="report-title">
              Departmental Attendance Report
            </h4>

            <p className="report-desc">
              Department-wise attendance summary (Daily / Monthly)
            </p>

            {/* 🔁 Mode Toggle */}
            <div className="report-mode-toggle">
              <button
                className={mode === "daily" ? "active" : ""}
                onClick={() => setMode("daily")}
              >
                Daily
              </button>
              <button
                className={mode === "monthly" ? "active" : ""}
                onClick={() => setMode("monthly")}
              >
                Monthly
              </button>
            </div>

            {/* 📅 Filters */}
            <div className="report-filters">
              {mode === "daily" && (
                <input
                  type="date"
                  value={date}
                  max={today}
                  onChange={(e) => setDate(e.target.value)}
                />
              )}

              {mode === "monthly" && (
                <>
                  <select
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                  >
                    {MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                  >
                    {Array.from({ length: 5 }).map((_, i) => {
                      const y = currentDate.getFullYear() - i;
                      return (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      );
                    })}
                  </select>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="report-actions">
              <Button
                className="generate-btn"
                onClick={handleGenerateDepartmentAttendance}
                disabled={loading}
              >
                {loading ? "Generating..." : "Generate"}
              </Button>

              {/* Export (logic later: daily / monthly / yearly) */}
              <button
                className="download-btn"
                disabled={!reportData.length}
                title="Export (CSV / Excel)"
              >
                <SvgIcon name="download" size={22} />
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Result Table */}
      {reportData.length > 0 && (
        <div className="report-result">
          <h3>
            Departmental Attendance –{" "}
            {mode === "daily"
              ? date
              : `${MONTHS.find((m) => m.value === month)?.label} ${year}`}
          </h3>

          <table className="report-table">
            <thead>
              <tr>
                <th>Department</th>
                <th>Total Employees</th>
                <th>Present</th>
                <th>Absent</th>
                <th>Late</th>
                <th>On Leave</th>
              </tr>
            </thead>
            <tbody>
              {reportData.map((dept, index) => (
                <tr key={index}>
                  <td>{dept.department}</td>
                  <td>{dept.totalEmployees}</td>
                  <td>{dept.present}</td>
                  <td>{dept.absent}</td>
                  <td>{dept.late}</td>
                  <td>{dept.onLeave}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {error && <p className="report-error">{error}</p>}

      <ScheduledReports />
    </div>
  );
}
