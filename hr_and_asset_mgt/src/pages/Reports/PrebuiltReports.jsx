import { useEffect, useState } from "react";
import api from "../../api/apiClient";
import { toast } from "react-toastify";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import SvgIcon from "../../components/svgIcon/svgView";
import Card from "../../components/reusable/Card";
import Button from "../../components/reusable/Button";
import ScheduledReports from "./ScheduledReports";
import { getBranches, getCompanies, getDepartments } from "../../services/masterService.js";
import "../../style/Reports.css";

const TABS = ["All", "HR", "Payroll", "Assets", "Documents", "Compliance", "Work Permit", "Work Visa"];

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
  const [reportSummary, setReportSummary] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [branchOptions, setBranchOptions] = useState([]);
  const [companyOptions, setCompanyOptions] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [branchReportFilters, setBranchReportFilters] = useState({
    branch: "All Branches",
    company: "All Companies",
    department: "All Departments",
    status: "All Status",
    search: "",
    page: 1,
    limit: 10
  });

  /** 🔁 Report Mode (for Attendance) */
  const [mode, setMode] = useState("monthly"); // daily | monthly

  /** 📅 Date / Month / Year / Days */
  const today = new Date().toISOString().split("T")[0];
  const currentDate = new Date();

  const [date, setDate] = useState(today);
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());
  const [days, setDays] = useState(30);

  useEffect(() => {
    Promise.all([getBranches(), getCompanies(), getDepartments()])
      .then(([branches, companies, departments]) => {
        setBranchOptions(Array.isArray(branches) ? branches : []);
        setCompanyOptions(Array.isArray(companies) ? companies : []);
        setDepartmentOptions(Array.isArray(departments) ? departments : []);
      })
      .catch((masterError) => {
        console.error("Failed to load report masters", masterError);
      });
  }, []);

  const handleGenerate = async (type) => {
    if (loading) return;

    try {
      setLoading(true);
      setError(null);
      setReportData([]);
      setReportType(type);
      setReportSummary(null);
      setPagination(null);

      let url = "";

      if (type === "attendance") {
        if (mode === "daily") {
          url = `/reports/department-attendance/daily?date=${date}`;
        } else {
          url = `/reports/department-attendance?month=${month}&year=${year}`;
        }
      } else if (type === "expiry") {
        url = `/reports/document-expiry?days=${days}`;
      } else if (type === "depreciation") {
        url = `/reports/asset-depreciation`;
      } else if (type === "payroll") {
        url = `/reports/payroll-summary?month=${month}&year=${year}`;
      } else if (type === "work-permit") {
        url = `/employees?limit=1000`;
      } else if (type === "work-visa") {
        url = `/employees?limit=1000`;
      } else if (type === "branch-wise-employees") {
        const params = new URLSearchParams();
        if (branchReportFilters.branch && branchReportFilters.branch !== "All Branches") params.set("branch", branchReportFilters.branch);
        if (branchReportFilters.company && branchReportFilters.company !== "All Companies") params.set("company", branchReportFilters.company);
        if (branchReportFilters.department && branchReportFilters.department !== "All Departments") params.set("department", branchReportFilters.department);
        if (branchReportFilters.status && branchReportFilters.status !== "All Status") params.set("status", branchReportFilters.status);
        if (branchReportFilters.search) params.set("search", branchReportFilters.search);
        params.set("page", String(branchReportFilters.page || 1));
        params.set("limit", String(branchReportFilters.limit || 10));
        url = `/reports/employees/branch-wise?${params.toString()}`;
      }

      const response = await api.get(url);

      if (type === "branch-wise-employees" && response.data.success) {
        const data = response.data.data || [];
        if (!data.length) {
          toast.warning("No employees found for the selected filters");
        } else {
          toast.success("Branch-wise employee report generated");
        }
        setReportData(data);
        setReportSummary(response.data.summary || null);
        setPagination(response.data.pagination || null);
      } else if (response.data.success) {
        const data = response.data.data || [];
        if (!data.length) {
          toast.warning("No data found for selected period");
        } else {
          toast.success("Report generated successfully");
        }
        setReportData(data);
      } else if (type === "work-permit" || type === "work-visa") {
        // Employees API returns array directly
        const allEmps = Array.isArray(response.data) ? response.data : (response.data.employees || response.data.data || []);
        const filtered = type === "work-permit"
          ? allEmps.filter(e => e.workPermitCompany)
          : allEmps.filter(e => e.visaCompany);
        if (!filtered.length) toast.warning("No employees found with " + (type === "work-permit" ? "Work Permit Company" : "Visa Company") + " set.");
        else toast.success("Report generated successfully");
        setReportData(filtered);
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
        ? `/reports/department-attendance/daily?date=${date}&export=true`
        : `/reports/department-attendance?month=${month}&year=${year}&export=true`;
    } else if (reportType === "expiry") {
      url = `/reports/document-expiry?days=${days}&export=true`;
    } else if (reportType === "depreciation") {
      url = `/reports/asset-depreciation?export=true`;
    } else if (reportType === "payroll") {
      url = `/reports/payroll-summary?month=${month}&year=${year}&export=true`;
    } else if (reportType === "wps") {
      url = `/reports/compliance/wps-sif?month=${month}&year=${year}`;
    } else if (reportType === "branch-wise-employees") {
      const params = new URLSearchParams();
      if (branchReportFilters.branch && branchReportFilters.branch !== "All Branches") params.set("branch", branchReportFilters.branch);
      if (branchReportFilters.company && branchReportFilters.company !== "All Companies") params.set("company", branchReportFilters.company);
      if (branchReportFilters.department && branchReportFilters.department !== "All Departments") params.set("department", branchReportFilters.department);
      if (branchReportFilters.status && branchReportFilters.status !== "All Status") params.set("status", branchReportFilters.status);
      if (branchReportFilters.search) params.set("search", branchReportFilters.search);
      params.set("export", "true");
      url = `/reports/employees/branch-wise?${params.toString()}`;
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
          else if (reportType === "branch-wise-employees") filename = "Branch_Wise_Employee_Report.xlsx";

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
              : reportType === "branch-wise-employees" ? "Branch Wise Employee Report"
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
        payroll: ["Department", "Emps", "Basic", "Allowances", "Deductions", "Net Paid"],
        "branch-wise-employees": ["Employee", "Code", "Company", "Branch", "Department", "Status"]
      };

      const tableData = reportData.map(row => {
        if (reportType === "attendance") return [row.department, row.totalEmployees, row.present, row.absent, row.late, row.onLeave];
        if (reportType === "expiry") return [row.type, row.owner, row.docType, new Date(row.expiryDate).toLocaleDateString(), `${row.daysRemaining} days`];
        if (reportType === "depreciation") return [row.assetCode, row.name, `AED ${row.purchaseCost}`, `AED ${row.annualDepreciation}`, `AED ${row.accumulatedDepreciation}`, `AED ${row.netBookValue}`];
        if (reportType === "payroll") return [row.department, row.employeeCount, `AED ${row.totalBasic}`, `AED ${row.totalAllowances}`, `AED ${row.totalDeductions}`, `AED ${row.totalNet}`];
        if (reportType === "branch-wise-employees") return [row.name, row.code, row.company || "—", row.branch || "—", row.department || "—", row.status || "—"];
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
      await api.post("/reports/log-activity", {
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

      const url = `/reports/compliance/wps-sif?month=${month}&year=${year}&format=json`;
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
                <div style={{ width: '100%' }}>
                  <input
                    type="date"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      backgroundColor: 'white',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                    value={date}
                    max={today}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              ) : (
                <>
                  <div style={{ flex: '2', minWidth: 0 }}>
                    <select
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        backgroundColor: 'white',
                        fontSize: '14px'
                      }}
                      value={month}
                      onChange={(e) => setMonth(Number(e.target.value))}
                    >
                      {MONTHS.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: '1', minWidth: 0 }}>
                    <select
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        backgroundColor: 'white',
                        fontSize: '14px'
                      }}
                      value={year}
                      onChange={(e) => setYear(Number(e.target.value))}
                    >
                      {[0, 1, 2, 3, 4].map(i => {
                        const y = currentDate.getFullYear() - i;
                        return <option key={y} value={y}>{y}</option>;
                      })}
                    </select>
                  </div>
                </>
              )}
            </div>
            <div className="report-actions">
              <Button className="generate-btn" onClick={() => handleGenerate("attendance")} disabled={loading}>Generate</Button>
            </div>
          </Card>
        )}

        {(activeTab === "HR" || activeTab === "All") && (
          <Card className="report-card">
            <div className="report-card-header">
              <div className="report-icon"><SvgIcon name="users" size={22} /></div>
              <span className="report-tag">HR</span>
            </div>
            <h4 className="report-title">Branch-wise Employee Report</h4>
            <p className="report-desc">Headcount and employee directory by branch with company, department, status, and payroll basis details.</p>
            <div className="report-filters">
              <div style={{ width: "100%" }}>
                <select style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #d1d5db", backgroundColor: "white", fontSize: "14px" }} value={branchReportFilters.branch} onChange={(e) => setBranchReportFilters((prev) => ({ ...prev, branch: e.target.value, page: 1 }))}>
                  <option>All Branches</option>
                  {branchOptions.map((item) => <option key={`report-branch-${item._id || item.name}`} value={item.name}>{item.name}</option>)}
                </select>
              </div>
              <div style={{ width: "100%" }}>
                <select style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #d1d5db", backgroundColor: "white", fontSize: "14px" }} value={branchReportFilters.company} onChange={(e) => setBranchReportFilters((prev) => ({ ...prev, company: e.target.value, page: 1 }))}>
                  <option>All Companies</option>
                  {companyOptions.map((item) => <option key={`report-company-${item._id || item.name}`} value={item.name}>{item.name}</option>)}
                </select>
              </div>
              <div style={{ width: "100%" }}>
                <select style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #d1d5db", backgroundColor: "white", fontSize: "14px" }} value={branchReportFilters.department} onChange={(e) => setBranchReportFilters((prev) => ({ ...prev, department: e.target.value, page: 1 }))}>
                  <option>All Departments</option>
                  {departmentOptions.map((item) => <option key={`report-department-${item._id || item.name || item}`} value={item.name || item}>{item.name || item}</option>)}
                </select>
              </div>
              <div style={{ width: "100%" }}>
                <select style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #d1d5db", backgroundColor: "white", fontSize: "14px" }} value={branchReportFilters.status} onChange={(e) => setBranchReportFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))}>
                  <option>All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Onboarding">Onboarding</option>
                </select>
              </div>
              <div style={{ width: "100%" }}>
                <input
                  type="text"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #d1d5db", backgroundColor: "white", fontSize: "14px", boxSizing: "border-box" }}
                  value={branchReportFilters.search}
                  placeholder="Search employee, code, email..."
                  onChange={(e) => setBranchReportFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }))}
                />
              </div>
            </div>
            <div className="report-actions">
              <Button className="generate-btn" onClick={() => handleGenerate("branch-wise-employees")} disabled={loading}>Generate</Button>
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
                <select
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    backgroundColor: 'white',
                    fontSize: '14px'
                  }}
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                >
                  <option value={30}>Next 30 Days</option>
                  <option value={60}>Next 60 Days</option>
                  <option value={90}>Next 90 Days</option>
                </select>
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
              <div className="report-icon"><SvgIcon name="cube" size={22} /></div>
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
              <div style={{ flex: '2', minWidth: 0 }}>
                <select
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    backgroundColor: 'white',
                    fontSize: '14px'
                  }}
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                >
                  <option value="" disabled>Select Month</option>
                  {MONTHS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: '1', minWidth: 0 }}>
                <select
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    backgroundColor: 'white',
                    fontSize: '14px'
                  }}
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                >
                  <option value="" disabled>Year</option>
                  {[0, 1, 2, 3, 4].map(i => {
                    const y = currentDate.getFullYear() - i;
                    return <option key={y} value={y}>{y}</option>;
                  })}
                </select>
              </div>
            </div>
            <div className="report-actions">
              <Button className="generate-btn" onClick={() => handleGenerate("payroll")} disabled={loading}>Generate</Button>
            </div>
          </Card>
        )}

        {/* Loan Report */}
        {(activeTab === "Payroll" || activeTab === "All") && (
          <Card className="report-card">
            <div className="report-card-header">
              <div className="report-icon"><SvgIcon name="dollar" size={22} /></div>
              <span className="report-tag">Payroll</span>
            </div>
            <h4 className="report-title">Loan Report</h4>
            <p className="report-desc">Complete loan and salary advance report with repayment tracking.</p>
            <div className="report-actions" style={{ marginTop: 'auto' }}>
              <Button className="generate-btn" onClick={async () => {
                try {
                  const res = await api.get("/reports/loans?export=true", { responseType: "blob" });
                  const url = window.URL.createObjectURL(new Blob([res.data]));
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = `Loan_Report_${new Date().toISOString().split("T")[0]}.xlsx`;
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                  toast.success("Loan report downloaded");
                } catch { toast.error("Failed to download loan report"); }
              }} disabled={loading}>
                Download Excel
              </Button>
            </div>
          </Card>
        )}

        {/* Appraisal Report */}
        {(activeTab === "HR" || activeTab === "All") && (
          <Card className="report-card">
            <div className="report-card-header">
              <div className="report-icon"><SvgIcon name="star" size={22} /></div>
              <span className="report-tag">HR</span>
            </div>
            <h4 className="report-title">Appraisal Report</h4>
            <p className="report-desc">Employee appraisal cycles with increment details and approval status.</p>
            <div className="report-actions" style={{ marginTop: 'auto' }}>
              <Button className="generate-btn" onClick={async () => {
                try {
                  const res = await api.get("/reports/appraisals?export=true", { responseType: "blob" });
                  const url = window.URL.createObjectURL(new Blob([res.data]));
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = `Appraisal_Report_${new Date().toISOString().split("T")[0]}.xlsx`;
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                  toast.success("Appraisal report downloaded");
                } catch { toast.error("Failed to download appraisal report"); }
              }} disabled={loading}>
                Download Excel
              </Button>
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
              <div style={{ flex: '2', minWidth: 0 }}>
                <select
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    backgroundColor: 'white',
                    fontSize: '14px'
                  }}
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                >
                  <option value="" disabled>Select Month</option>
                  {MONTHS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: '1', minWidth: 0 }}>
                <select
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    backgroundColor: 'white',
                    fontSize: '14px'
                  }}
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                >
                  <option value="" disabled>Year</option>
                  {[0, 1, 2, 3, 4].map(i => {
                    const y = currentDate.getFullYear() - i;
                    return <option key={y} value={y}>{y}</option>;
                  })}
                </select>
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

        {/* Work Permit Report */}
        {(activeTab === "Work Permit" || activeTab === "All") && (
          <Card className="report-card">
            <div className="report-card-header">
              <div className="report-icon" style={{ background: '#eff6ff' }}><SvgIcon name="briefcase" size={22} color="#1d4ed8" /></div>
              <span className="report-tag" style={{ background: '#dbeafe', color: '#1d4ed8' }}>HR</span>
            </div>
            <h4 className="report-title">Work Permit Report</h4>
            <p className="report-desc">List of employees grouped by Work Permit Company.</p>
            <div className="report-actions">
              <Button className="generate-btn" onClick={() => handleGenerate("work-permit")} disabled={loading}>Generate</Button>
            </div>
          </Card>
        )}

        {/* Work Visa Report */}
        {(activeTab === "Work Visa" || activeTab === "All") && (
          <Card className="report-card">
            <div className="report-card-header">
              <div className="report-icon" style={{ background: '#f0fdf4' }}><SvgIcon name="clipboard-list" size={22} color="#15803d" /></div>
              <span className="report-tag" style={{ background: '#dcfce7', color: '#15803d' }}>HR</span>
            </div>
            <h4 className="report-title">Work Visa Report</h4>
            <p className="report-desc">List of employees grouped by Visa Company with expiry status.</p>
            <div className="report-actions">
              <Button className="generate-btn" onClick={() => handleGenerate("work-visa")} disabled={loading}>Generate</Button>
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
            {reportType === "work-permit" && '🔖 Work Permit Report'}
            {reportType === "work-visa" && '🛂 Work Visa Report'}
            {reportType === "branch-wise-employees" && "Branch-wise Employee Report"}
          </h3>

          {reportType === "branch-wise-employees" && reportSummary && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "18px" }}>
              {[
                { label: "Total Employees", value: reportSummary.totalEmployees || 0 },
                { label: "Active", value: reportSummary.activeEmployees || 0 },
                { label: "Onboarding", value: reportSummary.onboardingEmployees || 0 },
                { label: "Branches", value: reportSummary.branchCount || 0 },
                { label: "Departments", value: reportSummary.departmentCount || 0 }
              ].map((item) => (
                <div key={item.label} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "14px 16px" }}>
                  <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.08em" }}>{item.label}</div>
                  <div style={{ fontSize: "24px", fontWeight: 700, color: "#0f172a" }}>{item.value}</div>
                </div>
              ))}
            </div>
          )}

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
                {(reportType === "work-permit" || reportType === "work-visa") && (
                  <tr>
                    <th>Employee</th>
                    <th>Code</th>
                    <th>Department</th>
                    <th>{reportType === "work-permit" ? "Work Permit Company" : "Visa Company"}</th>
                    <th>Visa Expiry</th>
                  </tr>
                )}
                {reportType === "branch-wise-employees" && (
                  <tr>
                    <th>Employee</th>
                    <th>Code</th>
                    <th>Company</th>
                    <th>Branch</th>
                    <th>Department</th>
                    <th>Designation</th>
                    <th>Status</th>
                    <th>Visa Base</th>
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
                    {(reportType === "work-permit" || reportType === "work-visa") && (
                      <>
                        <td><strong>{row.name}</strong></td>
                        <td style={{ color: '#6b7280' }}>{row.code}</td>
                        <td>{row.department}</td>
                        <td>
                          <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '3px 10px', borderRadius: '6px', fontSize: '13px' }}>
                            {reportType === "work-permit" ? row.workPermitCompany : row.visaCompany}
                          </span>
                        </td>
                        <td style={{ color: row.visaExpiry && new Date(row.visaExpiry) < new Date() ? '#dc2626' : '#16a34a' }}>
                          {row.visaExpiry ? new Date(row.visaExpiry).toLocaleDateString() : '—'}
                        </td>
                      </>
                    )}
                    {reportType === "branch-wise-employees" && (
                      <>
                        <td><strong>{row.name}</strong><div style={{ color: "#64748b", fontSize: "12px" }}>{row.email || "—"}</div></td>
                        <td>{row.code}</td>
                        <td>{row.company || "—"}</td>
                        <td>{row.branch || "—"}</td>
                        <td>{row.department || "—"}</td>
                        <td>{row.designation || "—"}</td>
                        <td>{row.status || "—"}</td>
                        <td>AED {Number(row.visaBase || 0).toLocaleString()}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {reportType === "branch-wise-employees" && pagination && pagination.pages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginTop: "16px" }}>
              <div style={{ color: "#64748b", fontSize: "14px" }}>
                Page {pagination.page} of {pagination.pages} • {pagination.total} employees
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (pagination.page > 1) {
                      const nextPage = pagination.page - 1;
                      setBranchReportFilters((prev) => ({ ...prev, page: nextPage }));
                      const params = new URLSearchParams();
                      if (branchReportFilters.branch && branchReportFilters.branch !== "All Branches") params.set("branch", branchReportFilters.branch);
                      if (branchReportFilters.company && branchReportFilters.company !== "All Companies") params.set("company", branchReportFilters.company);
                      if (branchReportFilters.department && branchReportFilters.department !== "All Departments") params.set("department", branchReportFilters.department);
                      if (branchReportFilters.status && branchReportFilters.status !== "All Status") params.set("status", branchReportFilters.status);
                      if (branchReportFilters.search) params.set("search", branchReportFilters.search);
                      params.set("page", String(nextPage));
                      params.set("limit", String(branchReportFilters.limit || 10));
                      api.get(`/reports/employees/branch-wise?${params.toString()}`).then((response) => {
                        if (response.data.success) {
                          setReportData(response.data.data || []);
                          setReportSummary(response.data.summary || null);
                          setPagination(response.data.pagination || null);
                        }
                      });
                    }
                  }}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (pagination.page < pagination.pages) {
                      const nextPage = pagination.page + 1;
                      setBranchReportFilters((prev) => ({ ...prev, page: nextPage }));
                      const params = new URLSearchParams();
                      if (branchReportFilters.branch && branchReportFilters.branch !== "All Branches") params.set("branch", branchReportFilters.branch);
                      if (branchReportFilters.company && branchReportFilters.company !== "All Companies") params.set("company", branchReportFilters.company);
                      if (branchReportFilters.department && branchReportFilters.department !== "All Departments") params.set("department", branchReportFilters.department);
                      if (branchReportFilters.status && branchReportFilters.status !== "All Status") params.set("status", branchReportFilters.status);
                      if (branchReportFilters.search) params.set("search", branchReportFilters.search);
                      params.set("page", String(nextPage));
                      params.set("limit", String(branchReportFilters.limit || 10));
                      api.get(`/reports/employees/branch-wise?${params.toString()}`).then((response) => {
                        if (response.data.success) {
                          setReportData(response.data.data || []);
                          setReportSummary(response.data.summary || null);
                          setPagination(response.data.pagination || null);
                        }
                      });
                    }
                  }}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
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
