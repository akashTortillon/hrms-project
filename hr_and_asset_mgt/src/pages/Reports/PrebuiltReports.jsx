import { useState } from "react";
import api from "../../api/apiClient";
import { toast } from "react-toastify";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import SvgIcon from "../../components/svgIcon/svgView";
import Card from "../../components/reusable/Card";
import Button from "../../components/reusable/Button";
import ScheduledReports from "./ScheduledReports";
import CustomSelect from "../../components/reusable/CustomSelect";
import CustomDatePicker from "../../components/reusable/CustomDatePicker";

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
  const [activeTab, setActiveTab] = useState("All");
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [reportType, setReportType] = useState(""); // attendance | expiry | depreciation | payroll
  const [error, setError] = useState(null);

  /** 🔁 Report Mode (for Attendance) */
  const [mode, setMode] = useState("monthly"); // daily | monthly

  /** 📅 Date / Month / Year / Days */
  const today = new Date().toISOString().split("T")[0];
  const currentDate = new Date();

  const [date, setDate] = useState(today);
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());
  const [days, setDays] = useState(30);

  const handleGenerate = async (type) => {
    if (loading) return;

    try {
      setLoading(true);
      setError(null);
      setReportData([]);
      setReportType(type);

      let url = "";

      if (type === "attendance") {
        if (mode === "daily") {
          url = `/api/reports/department-attendance/daily?date=${date}`;
        } else {
          url = `/api/reports/department-attendance?month=${month}&year=${year}`;
        }
      } else if (type === "expiry") {
        url = `/api/reports/document-expiry?days=${days}`;
      } else if (type === "depreciation") {
        url = `/api/reports/asset-depreciation`;
      } else if (type === "payroll") {
        url = `/api/reports/payroll-summary?month=${month}&year=${year}`;
      }

      const response = await api.get(url);

      if (response.data.success) {
        const data = response.data.data || [];
        if (!data.length) {
          toast.warning("No data found for selected period");
        } else {
          toast.success("Report generated successfully");
        }
        setReportData(data);
      } else {
        toast.error("Failed to generate report");
        setError("Failed to generate report");
      }
    } catch (err) {
      console.error("Report Generation Error:", err);
      toast.error(err.response?.data?.message || "Error generating report");
      setError("Error generating report");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    if (!reportType) return;

    let url = "";
    // Note: using relative paths for api client
    if (reportType === "attendance") {
      url = mode === "daily"
        ? `/api/reports/department-attendance/daily?date=${date}&export=true`
        : `/api/reports/department-attendance?month=${month}&year=${year}&export=true`;
    } else if (reportType === "expiry") {
      url = `/api/reports/document-expiry?days=${days}&export=true`;
    } else if (reportType === "depreciation") {
      url = `/api/reports/asset-depreciation?export=true`;
    } else if (reportType === "payroll") {
      url = `/api/reports/payroll-summary?month=${month}&year=${year}&export=true`;
    } else if (reportType === "wps") {
      url = `/api/reports/compliance/wps-sif?month=${month}&year=${year}`;
    }

    if (url) {
      if (format === "excel" || reportType === "wps") {
        try {
          const response = await api.get(url, { responseType: 'blob' });
          const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a');
          link.href = blobUrl;

          // Generate Filename
          let filename = "Report.xlsx";
          if (reportType === "wps") filename = "WPS_SIF.sif";
          else if (reportType === "attendance") filename = `Attendance_${mode}_${date || `${month}_${year}`}.xlsx`;
          else if (reportType === "payroll") filename = `Payroll_${month}_${year}.xlsx`;

          link.setAttribute('download', filename);
          document.body.appendChild(link);
          link.click();
          link.remove();
        } catch (e) {
          console.error("Export error", e);
          toast.error("Export failed");
        }
      } else if (format === "pdf") {
        generatePDF();
      }
    }
  };

  const generatePDF = async () => {
    if (!reportData.length) return;

    try {
      const doc = new jsPDF();

      // --- Branded Logo Section ---
      // 1. Blue Icon Box
      doc.setFillColor(37, 99, 235); // #2563eb
      doc.roundedRect(14, 10, 15, 15, 3, 3, 'F');

      // 2. White "HR" Text
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("HR", 18, 19);

      // 3. Brand Text
      doc.setTextColor(31, 41, 55); // #1f2937
      doc.setFontSize(14);
      doc.text("HRMS Pro", 34, 17);

      doc.setTextColor(107, 114, 128); // #6b7280
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("UAE Edition", 34, 22);

      // --- Line Separator ---
      doc.setDrawColor(229, 231, 235); // #e5e7eb
      doc.line(14, 30, 196, 30);

      const title = reportType === "attendance"
        ? `Departmental Attendance - ${mode === "daily" ? date : `${MONTHS.find(m => m.value === month)?.label} ${year}`}`
        : reportType === "expiry" ? `Document Expiry Forecast - Next ${days} Days`
          : reportType === "depreciation" ? `Asset Depreciation Schedule`
            : reportType === "payroll" ? `Payroll Summary - ${MONTHS.find(m => m.value === month)?.label} ${year}`
              : "HR Report";

      doc.setTextColor(17, 24, 39); // #111827
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(title, 14, 42);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(156, 163, 175); // #9ca3af
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 48);

      const tableHeaders = {
        attendance: ["Department", "Employees", "Present", "Absent", "Late", "Leave"],
        expiry: ["Type", "Owner", "Document", "Expiry Date", "Days Rem."],
        depreciation: ["Code", "Name", "Cost", "Annual Dep.", "Accumulated", "Book Value"],
        payroll: ["Department", "Emps", "Basic", "Allowances", "Deductions", "Net Paid"]
      };

      const tableData = reportData.map(row => {
        if (reportType === "attendance") return [row.department, row.totalEmployees, row.present, row.absent, row.late, row.onLeave];
        if (reportType === "expiry") return [row.type, row.owner, row.docType, new Date(row.expiryDate).toLocaleDateString(), `${row.daysRemaining} days`];
        if (reportType === "depreciation") return [row.assetCode, row.name, `AED ${row.purchaseCost}`, `AED ${row.annualDepreciation}`, `AED ${row.accumulatedDepreciation}`, `AED ${row.netBookValue}`];
        if (reportType === "payroll") return [row.department, row.employeeCount, `AED ${row.totalBasic}`, `AED ${row.totalAllowances}`, `AED ${row.totalDeductions}`, `AED ${row.totalNet}`];
        return [];
      });

      autoTable(doc, {
        startY: 55,
        head: [tableHeaders[reportType]],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 9 }
      });

      doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
      toast.success("PDF generated successfully");

      // Log the activity to update the dashboard stats
      await api.post("/api/reports/log-activity", {
        type: "Export",
        reportName: title
      });

    } catch (error) {
      console.error("PDF Generation Error:", error);
      toast.error("Failed to generate PDF");
    }
  };

  const handleManualGenerateWPS = async () => {
    if (loading) return;
    try {
      setLoading(true);
      setError(null);
      setReportData([]);
      setReportType("wps");

      const url = `/api/reports/compliance/wps-sif?month=${month}&year=${year}&format=json`;
      const response = await api.get(url);

      if (response.data.success) {
        setReportData(response.data.data || []);
        toast.success("WPS Preview generated");
      }
    } catch (err) {
      toast.error("Failed to fetch WPS preview");
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
              setReportType("");
              setError(null);
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="reports-grid">
        {/* Departmental Attendance */}
        {(activeTab === "HR" || activeTab === "All") && (
          <Card className="report-card">
            <div className="report-card-header">
              <div className="report-icon"><SvgIcon name="calendar" size={22} /></div>
              <span className="report-tag">HR</span>
            </div>
            <h4 className="report-title">Departmental Attendance</h4>
            <p className="report-desc">Summary of present, absent, and leave counts by department.</p>

            {/* <div className="report-mode-toggle" style={{ marginTop: '15px' }}>
              <button className={mode === "daily" ? "active" : ""} onClick={() => setMode("daily")}>Daily</button>
              <button className={mode === "monthly" ? "active" : ""} onClick={() => setMode("monthly")}>Monthly</button>
            </div> */}


            <div
              className="report-mode-toggle"
              style={{
                display: "inline-flex",
                gap: "4px",
                padding: "4px",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                background: "var(--color-bg-card)",
                marginTop: "15px"
              }}
            >
              <button
                onClick={() => setMode("daily")}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 500,
                  background: mode === "daily" ? "#ffffff" : "transparent",
                  color: mode === "daily" ? "var(--text)" : "var(--muted)",
                  boxShadow: mode === "daily"
                    ? "0 2px 6px rgba(0,0,0,0.08)"
                    : "none",
                  transition: "all 0.2s ease"
                }}
              >
                Daily
              </button>

              <button
                onClick={() => setMode("monthly")}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 500,
                  background: mode === "monthly" ? "#ffffff" : "transparent",
                  color: mode === "monthly" ? "var(--text)" : "var(--muted)",
                  boxShadow: mode === "monthly"
                    ? "0 2px 6px rgba(0,0,0,0.08)"
                    : "none",
                  transition: "all 0.2s ease"
                }}
              >
                Monthly
              </button>
            </div>







            <div className="report-filters">
              {mode === "daily" ? (
                <CustomDatePicker
                  value={date}
                  maxDate={today}
                  onChange={(e) => setDate(e.target.value)}
                  placeholder="Select Date"
                />
              ) : (
                <>
                  <>
                    <div style={{ width: '140px' }}>
                      <CustomSelect
                        value={month}
                        onChange={(val) => setMonth(Number(val))}
                        options={MONTHS.map(m => ({ value: m.value, label: m.label }))}
                      />
                    </div>
                    <div style={{ width: '100px' }}>
                      <CustomSelect
                        value={year}
                        onChange={(val) => setYear(Number(val))}
                        options={[0, 1, 2, 3, 4].map(i => ({ value: currentDate.getFullYear() - i, label: String(currentDate.getFullYear() - i) }))}
                      />
                    </div>
                  </>
                </>
              )}
            </div>
            <div className="report-actions">
              <Button className="generate-btn" onClick={() => handleGenerate("attendance")} disabled={loading}>Generate</Button>
            </div>
          </Card>
        )}

        {/* Document Expiry */}
        {(activeTab === "Documents" || activeTab === "All") && (
          <Card className="report-card">
            <div className="report-card-header">
              <div className="report-icon"><SvgIcon name="document" size={22} /></div>
              <span className="report-tag">Docs</span>
            </div>
            <h4 className="report-title">Document Expiry Forecast</h4>
            <p className="report-desc">Preview company and employee documents set to expire soon.</p>
            <div className="report-filters">
              <div style={{ width: '200px' }}>
                <CustomSelect
                  value={days}
                  onChange={(val) => setDays(Number(val))}
                  options={[
                    { value: 30, label: "Next 30 Days" },
                    { value: 60, label: "Next 60 Days" },
                    { value: 90, label: "Next 90 Days" }
                  ]}
                />
              </div>
            </div>
            <div className="report-actions">
              <Button className="generate-btn" onClick={() => handleGenerate("expiry")} disabled={loading}>Generate</Button>
            </div>
          </Card>
        )}

        {/* Asset Depreciation */}
        {(activeTab === "Assets" || activeTab === "All") && (
          <Card className="report-card">
            <div className="report-card-header">
              <div className="report-icon"><SvgIcon name="dollar" size={22} /></div>
              <span className="report-tag">Assets</span>
            </div>
            <h4 className="report-title">Asset Depreciation Schedule</h4>
            <p className="report-desc">Valuation of company assets based on age and category rates.</p>
            <div className="report-actions" style={{ marginTop: 'auto' }}>
              <Button className="generate-btn" onClick={() => handleGenerate("depreciation")} disabled={loading}>Generate</Button>
            </div>
          </Card>
        )}

        {/* Payroll Summary */}
        {(activeTab === "Payroll" || activeTab === "All") && (
          <Card className="report-card">
            <div className="report-card-header">
              <div className="report-icon"><SvgIcon name="dollar" size={22} /></div>
              <span className="report-tag">Payroll</span>
            </div>
            <h4 className="report-title">Payroll Monthly Summary</h4>
            <p className="report-desc">Total cost breakdown per department for the selected month.</p>
            <div className="report-filters">
              <div style={{ width: '140px' }}>
                <CustomSelect
                  value={month}
                  onChange={(val) => setMonth(Number(val))}
                  options={MONTHS.map(m => ({ value: m.value, label: m.label }))}
                  placeholder="Select Month"
                />
              </div>
              <div style={{ width: '100px' }}>
                <CustomSelect
                  value={year}
                  onChange={(val) => setYear(Number(val))}
                  options={[0, 1, 2, 3, 4].map(i => ({ value: currentDate.getFullYear() - i, label: String(currentDate.getFullYear() - i) }))}
                  placeholder="Year"
                />
              </div>
            </div>
            <div className="report-actions">
              <Button className="generate-btn" onClick={() => handleGenerate("payroll")} disabled={loading}>Generate</Button>
            </div>
          </Card>
        )}

        {/* WPS Salary File */}
        {(activeTab === "Compliance" || activeTab === "All") && (
          <Card className="report-card">
            <div className="report-card-header">
              <div className="report-icon" style={{ backgroundColor: '#fff0f0' }}><SvgIcon name="document" size={22} color="#ff4d4d" /></div>
              <span className="report-tag">Compliance</span>
            </div>
            <h4 className="report-title">WPS Salary File</h4>
            <p className="report-desc">Generate WPS-compliant salary payment file</p>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '10px' }}>Last: {new Date().toISOString().split('T')[0]} • Monthly</div>

            <div className="report-filters">
              <div style={{ width: '140px' }}>
                <CustomSelect
                  value={month}
                  onChange={(val) => setMonth(Number(val))}
                  options={MONTHS.map(m => ({ value: m.value, label: m.label }))}
                  placeholder="Select Month"
                />
              </div>
              <div style={{ width: '100px' }}>
                <CustomSelect
                  value={year}
                  onChange={(val) => setYear(Number(val))}
                  options={[0, 1, 2, 3, 4].map(i => ({ value: currentDate.getFullYear() - i, label: String(currentDate.getFullYear() - i) }))}
                  placeholder="Year"
                />
              </div>
            </div>

            <div className="report-actions" style={{ display: 'flex', gap: '8px' }}>
              <Button className="generate-btn" onClick={handleManualGenerateWPS} disabled={loading} style={{ flex: 1 }}>Generate</Button>
              <button
                onClick={() => handleExport("wps")}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  background: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <SvgIcon name="download" size={18} />
              </button>
            </div>
          </Card>
        )}
      </div>

      {/* Result Section */}
      {reportData.length > 0 && (
        <div className="report-result">
          <h3>
            {reportType === "attendance" && `Departmental Attendance – ${mode === "daily" ? date : `${MONTHS.find(m => m.value === month)?.label} ${year}`}`}
            {reportType === "expiry" && `Document Expiry Forecast – Next ${days} Days`}
            {reportType === "depreciation" && `Asset Depreciation Schedule – As of Today`}
            {reportType === "payroll" && `Payroll Summary – ${MONTHS.find(m => m.value === month)?.label} ${year}`}
            {reportType === "wps" && `WPS Salary File Preview – ${MONTHS.find(m => m.value === month)?.label} ${year}`}
          </h3>

          <div className="report-table-wrapper">
            <table className="report-table">
              <thead>
                {reportType === "attendance" && (
                  <tr>
                    <th>Department</th>
                    <th>Employees</th>
                    <th>Present</th>
                    <th>Absent</th>
                    <th>Late</th>
                    <th>On Leave</th>
                  </tr>
                )}
                {reportType === "expiry" && (
                  <tr>
                    <th>Type</th>
                    <th>Owner</th>
                    <th>Document</th>
                    <th>Expiry Date</th>
                    <th>Remaining</th>
                  </tr>
                )}
                {reportType === "depreciation" && (
                  <tr>
                    <th>Code</th>
                    <th>Asset Name</th>
                    <th>Purchase Cost</th>
                    <th>Annual Dep.</th>
                    <th>Accumulated</th>
                    <th>Net Book Value</th>
                  </tr>
                )}
                {reportType === "payroll" && (
                  <tr>
                    <th>Department</th>
                    <th>Emps</th>
                    <th>Basic</th>
                    <th>Allowances</th>
                    <th>Deductions</th>
                    <th>Net Paid</th>
                  </tr>
                )}
                {reportType === "wps" && (
                  <tr>
                    <th>Employee</th>
                    <th>Code</th>
                    <th>IBAN/Account</th>
                    <th>Basic</th>
                    <th>Allowances</th>
                    <th>Net Payable</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {reportData.map((row, index) => (
                  <tr key={index}>
                    {reportType === "attendance" && (
                      <>
                        <td>{row.department}</td>
                        <td>{row.totalEmployees}</td>
                        <td>{row.present}</td>
                        <td>{row.absent}</td>
                        <td>{row.late}</td>
                        <td>{row.onLeave}</td>
                      </>
                    )}
                    {reportType === "expiry" && (
                      <>
                        <td><span className={`status-badge ${row.type.toLowerCase()}`}>{row.type}</span></td>
                        <td>{row.owner}</td>
                        <td>{row.docType}</td>
                        <td>{new Date(row.expiryDate).toLocaleDateString()}</td>
                        <td><span style={{ color: row.daysRemaining < 10 ? 'red' : 'orange' }}>{row.daysRemaining} days</span></td>
                      </>
                    )}
                    {reportType === "depreciation" && (
                      <>
                        <td>{row.assetCode}</td>
                        <td>{row.name}</td>
                        <td>AED {row.purchaseCost}</td>
                        <td>AED {row.annualDepreciation}</td>
                        <td>AED {row.accumulatedDepreciation}</td>
                        <td><strong>AED {row.netBookValue}</strong></td>
                      </>
                    )}
                    {reportType === "payroll" && (
                      <>
                        <td>{row.department}</td>
                        <td>{row.employeeCount}</td>
                        <td>AED {row.totalBasic}</td>
                        <td>AED {row.totalAllowances}</td>
                        <td>AED {row.totalDeductions}</td>
                        <td><strong>AED {row.totalNet}</strong></td>
                      </>
                    )}
                    {reportType === "wps" && (
                      <>
                        <td>{row["Employee"]}</td>
                        <td>{row["Code"]}</td>
                        <td>{row["IBAN/Account"]}</td>
                        <td>AED {row["Basic"]}</td>
                        <td>AED {row["Allowances"]}</td>
                        <td><strong>AED {row["Total Net"]}</strong></td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
            <Button variant="outline" onClick={() => handleExport("excel")}>Export as Excel</Button>
            <Button variant="outline" onClick={() => handleExport("pdf")}>Export as PDF</Button>
          </div>
        </div>
      )}

      {error && <p className="report-error">{error}</p>}

      <ScheduledReports />
    </div>
  );
}
