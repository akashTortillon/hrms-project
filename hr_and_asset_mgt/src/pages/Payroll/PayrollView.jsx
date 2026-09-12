import { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import Card from "../../components/reusable/Card.jsx";
import SvgIcon from "../../components/svgIcon/svgView";
import PayrollSummaryCards from "./PayrollCards";
import PayrollEmployeesTable from "./PayrollTable";
import { EmployeePayrollOverviewChart, LoansAdvancesChart } from "./PayrollCharts";
import { payrollService } from "../../services/payrollService";
import { getCompanies, getBranches } from "../../services/masterService.js";
import CustomModal from "../../components/reusable/CustomModal.jsx";
import CustomButton from "../../components/reusable/Button.jsx";

// Reusable filter section (Original logic + New Style)
function PayrollFilters({ filters, setFilters, companies, branches }) {
  return (
    <div className="payroll-filter-section">
      <div className="filter-group">
        <select
          value={filters.company || ''}
          onChange={e => setFilters(f => ({ ...f, company: e.target.value, page: 1 }))}
        >
          <option value="">All Companies</option>
          {companies.map(c => <option key={c._id || c.name} value={c.name}>{c.name}</option>)}
        </select>
      </div>

      <div className="filter-group">
        <select
          value={filters.branch || ''}
          onChange={e => setFilters(f => ({ ...f, branch: e.target.value, page: 1 }))}
        >
          <option value="">All Branches</option>
          {branches.map(b => <option key={b._id || b.name} value={b.name}>{b.name}</option>)}
        </select>
      </div>

      <div className="filter-group" style={{ flex: 2 }}>
        <input
          type="text"
          placeholder="Search employees..."
          value={filters.search || ''}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
        />
      </div>

      <button className="filter-btn-primary" onClick={() => setFilters(f => ({...f, page: 1}))}>
        Apply Filters
      </button>
    </div>
  );
}

// Work Permit / Visa Report Table (Original columns + New Style)
function WorkReportTable({ records, reportType, loading, onExport }) {
  const companyKey = reportType === 'permit' ? 'workPermitCompany' : 'visaCompany';
  const label = reportType === 'permit' ? 'Location' : 'Visa';

  const filtered = records.filter(r => r.employee?.[companyKey]);

  return (
    <div className="payroll-list-table-wrapper">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
          <button className="export-record-btn" onClick={onExport}>
              <SvgIcon name="download" size={14} />
              Export Record
          </button>
      </div>

      <table className="payroll-modern-table">
        <thead>
          <tr>
            <th>EMPLOYEE</th>
            <th>{label.toUpperCase()}</th>
            <th>BASIC SALARY</th>
            <th>ALLOWANCES</th>
            <th>DEDUCTIONS</th>
            <th>NET SALARY</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan="6" className="text-center p-4">Loading...</td></tr>
          ) : filtered.length === 0 ? (
            <tr><td colSpan="6" className="text-center p-4">No records found.</td></tr>
          ) : filtered.map(record => (
            <tr key={record._id}>
              <td>
                <div className="p-emp-name">{record.employee?.name || 'Unknown'}</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>{record.employee?.code}</div>
              </td>
              <td>
                <span className="p-status-badge approved">
                  {record.employee?.[companyKey]}
                </span>
              </td>
              <td className="p-salary">{(record.basicSalary || 0).toLocaleString()} AED</td>
              <td style={{ color: '#10b981' }}>+{(record.totalAllowances || 0).toLocaleString()} AED</td>
              <td style={{ color: '#f43f5e' }}>-{(record.totalDeductions || 0).toLocaleString()} AED</td>
              <td className="p-salary" style={{ fontWeight: '700' }}>{(record.netSalary || 0).toLocaleString()} AED</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Pagination component (Original Style wrapper)
function PayrollPagination({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  const { current, totalPages } = pagination;
  return (
    <div className="payroll-pagination">
      <div className="pagination-info">Page {current} of {totalPages}</div>
      <div className="pagination-controls">
        <button onClick={() => onPageChange(current - 1)} disabled={current === 1} className="pag-btn">←</button>
        <button className="pag-btn active">{current}</button>
        <button onClick={() => onPageChange(current + 1)} disabled={current === totalPages} className="pag-btn blue-pag">→</button>
      </div>
    </div>
  );
}

const pad2 = (n) => String(n).padStart(2, "0");
const toDateStr = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

function Payroll() {
  // Rolling pay period — force-contiguous. periodStart is always auto-computed
  // (locked to the day after the last finalized period's end) and periodEnd is
  // the only date HR actually picks. month/year below are DERIVED from periodEnd
  // purely for the existing month/year-based read endpoints (summary, exports,
  // SIF, MOL) — the real period identity lives in periodStart/periodEnd.
  const today = new Date();
  const [periodStart, setPeriodStart] = useState(toDateStr(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [periodEnd, setPeriodEnd] = useState(toDateStr(new Date(today.getFullYear(), today.getMonth() + 1, 0)));
  // Guards fetchPayroll/fetchAllRecords against out-of-order responses: on mount, the
  // initial period's fetch fires, then fetchLatestFinalized's auto-advance changes
  // periodEnd milliseconds later and fires a second fetch for the new period. If the
  // FIRST (now-stale) request resolves after the second, it used to overwrite `records`
  // with the wrong period's data - e.g. the Finalize/Generate badges kept showing
  // "Finalized" (from the old period) for a brand new period with zero records, with no
  // way to tell without comparing timestamps. Each fetch takes a ticket; only the
  // latest ticket's response is applied.
  const fetchSeqRef = useRef(0);
  const periodEndDate = new Date(`${periodEnd}T00:00:00`);
  const month = periodEndDate.getMonth() + 1;
  const year = periodEndDate.getFullYear();
  const [activeTab, setActiveTab] = useState('Payroll');
  const [records, setRecords] = useState([]);
  const [allRecords, setAllRecords] = useState([]); // unfiltered for report tabs
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({});
  const [pagination, setPagination] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [branches, setBranches] = useState([]);
  const [filters, setFilters] = useState({ company: '', branch: '', visaCompany: '', workPermitCompany: '', search: '', page: 1, limit: 10 });
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [finalizeConfirmText, setFinalizeConfirmText] = useState("");
  const [showUnfinalizeConfirm, setShowUnfinalizeConfirm] = useState(false);
  const [unfinalizeConfirmText, setUnfinalizeConfirmText] = useState("");
  // { month, year, periodStart, periodEnd, finalizedAt } | null
  const [latestFinalized, setLatestFinalized] = useState(null);

  // --- MOCK DATA FOR CHARTS (To avoid breaking backend dependencies) ---
  const mockTrends = [
    { name: 'Jan', netSalary: 45000, deductions: 5000 },
    { name: 'Feb', netSalary: 46000, deductions: 4800 },
    { name: 'Mar', netSalary: 48000, deductions: 5200 },
    { name: 'Apr', netSalary: 44000, deductions: 4500 },
    { name: 'May', netSalary: 47000, deductions: 5000 },
    { name: 'Jun', netSalary: 49000, deductions: 5500 },
  ];

  const mockLoans = [
    { name: 'Loans', value: 12500 },
    { name: 'Salary Advances', value: 8400 },
  ];

  useEffect(() => {
    getCompanies().then(setCompanies).catch(console.error);
    getBranches().then(setBranches).catch(console.error);
    fetchLatestFinalized();
  }, []);

  // Just updates `latestFinalized` (drives the Un-finalize button's canUnfinalize
  // check) without touching the displayed period. Use this after Finalize/Un-finalize
  // — the admin is looking at the period they just acted on and the view shouldn't
  // jump elsewhere. Only the mount-time fetchLatestFinalized() below should ever
  // move periodStart/periodEnd.
  const refreshLatestFinalized = async () => {
    try {
      const latest = await payrollService.getLatestFinalizedPeriod();
      setLatestFinalized(latest);
      return latest;
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  const fetchLatestFinalized = async () => {
    const latest = await refreshLatestFinalized();

    // periodStart is always locked to the day after the last finalized period's
    // end (force-contiguous — no gaps, no overlaps). If the current periodEnd
    // selection is already covered by that lock, bump it forward to a sensible
    // ~1-month default instead of landing on an already-locked period.
    // Comparing plain "YYYY-MM-DD" strings (from the server) — avoids any
    // browser/server timezone drift that reconstructing Date objects here would risk.
    // Mount-only (see the useEffect below) — don't call this after Finalize/Un-finalize,
    // it would silently jump the admin off the period they just acted on (was the bug
    // behind "Export/SIF/MOL disappeared after Finalize, new date came into place").
    if (latest) {
      const lockedEndStr = latest.periodEndStr;
      const lockedEnd = new Date(`${lockedEndStr}T00:00:00`);
      const requiredStart = new Date(lockedEnd);
      requiredStart.setDate(requiredStart.getDate() + 1);
      setPeriodStart(toDateStr(requiredStart));

      if (periodEnd <= lockedEndStr) {
        const suggestedEnd = new Date(requiredStart);
        suggestedEnd.setMonth(suggestedEnd.getMonth() + 1);
        suggestedEnd.setDate(suggestedEnd.getDate() - 1);
        setPeriodEnd(toDateStr(suggestedEnd));
      }
    }
  };

  useEffect(() => {
    fetchPayroll();
  }, [periodEnd, filters]);

  useEffect(() => {
    if (activeTab !== 'Payroll') {
      fetchAllRecords();
    }
  }, [activeTab, periodEnd, filters]);

  const fetchPayroll = async () => {
    const seq = ++fetchSeqRef.current;
    try {
      setLoading(true);
      const data = await payrollService.getSummary(month, year, filters);
      if (seq !== fetchSeqRef.current) return; // superseded by a newer fetch - stale, ignore
      setRecords(data.records || []);
      setStats(data.stats || {});
      setPagination(data.pagination || null);
    } catch (error) {
      if (seq !== fetchSeqRef.current) return;
      console.error(error);
      toast.error("Failed to fetch payroll summary");
    } finally {
      if (seq === fetchSeqRef.current) setLoading(false);
    }
  };

  const fetchAllRecords = async () => {
    const seq = ++fetchSeqRef.current;
    try {
      setLoading(true);
      const reportType = activeTab === 'Location report' ? 'permit' : activeTab === 'Visa report' ? 'visa' : null;
      const data = await payrollService.getSummary(month, year, { ...filters, reportType, limit: 1000 });
      if (seq !== fetchSeqRef.current) return;
      setAllRecords(data.records || []);
    } catch (error) {
      if (seq !== fetchSeqRef.current) return;
      console.error(error);
    } finally {
      if (seq === fetchSeqRef.current) setLoading(false);
    }
  };

  const handleGenerate = async () => {
    try {
      setLoading(true);
      await payrollService.generate(periodStart, periodEnd);
      toast.success("Payroll Generated Successfully!");
      fetchPayroll();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to generate payroll");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    try {
      setLoading(true);
      await payrollService.finalize(periodStart, periodEnd);
      toast.success("Payroll Finalized & Locked!");
      fetchPayroll();
      refreshLatestFinalized();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to finalize");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmFinalize = () => {
    setShowFinalizeConfirm(false);
    setFinalizeConfirmText("");
    handleFinalize();
  };

  const handleUnfinalize = async () => {
    try {
      setLoading(true);
      await payrollService.unfinalize(periodStart, periodEnd);
      toast.success("Payroll un-finalized — period is editable again.");
      fetchPayroll();
      refreshLatestFinalized();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to un-finalize");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmUnfinalize = () => {
    setShowUnfinalizeConfirm(false);
    setUnfinalizeConfirmText("");
    handleUnfinalize();
  };

  const handleExportExcel = async (reportType = null) => {
    try {
      await payrollService.exportExcel(month, year, reportType, filters);
      toast.success("Export Downloaded!");
    } catch (error) {
      // was a hardcoded "Export failed." regardless of the real reason (e.g. "No
      // records found for this month") - payrollService now extracts the actual
      // backend message even though these are blob responses, see blobErrorMessage.
      toast.error(error.message || "Export failed.");
    }
  };

  const handleGenerateSIF = async () => {
    try {
      // Pass the exact period too, not just the derived month/year - see
      // payrollService.generateSIF's comment (avoids a mismatch against whatever the
      // "Finalized" badge is actually keyed to).
      await payrollService.generateSIF(month, year, periodStart, periodEnd);
      toast.success("SIF File Generated!");
    } catch (error) {
      toast.error(error.message || "SIF Generation failed.");
    }
  };

  const handleGenerateMOL = async () => {
    try {
      await payrollService.downloadMOLReport(month, year);
      toast.success("MOL Report Downloaded!");
    } catch (error) {
      toast.error(error.message || "Failed to download MOL Report");
    }
  };

  // '' = whole year (existing behavior); a specific month narrows the download to
  // just that month. Year defaults to the main date picker's year but is independently
  // selectable - was hardcoded to `year` with no way to reach 2024/2025 etc.
  const [historyMonth, setHistoryMonth] = useState('');
  const [historyYear, setHistoryYear] = useState(year);

  const handlePaymentHistory = async () => {
    try {
      await payrollService.downloadPaymentHistory(historyYear, historyMonth || null);
      toast.success(historyMonth ? `Payment History for ${historyMonth}/${historyYear} Downloaded!` : `Payment History for ${historyYear} Downloaded!`);
    } catch (error) {
      toast.error(error.message || "Failed to download History");
    }
  };

  // Derive state guards
  const isGenerated = records.length > 0;
  const isFinalized = isGenerated && records.every(r => r.status === 'PROCESSED' || r.status === 'PAID');
  // Un-finalize is only allowed on the exact period the server considers "latest
  // finalized" — matches the backend's own restriction (undoing an older locked
  // period while a later one stays locked would desync the force-contiguous chain).
  // String comparison against the server's own formatted date — no timezone risk.
  const canUnfinalize = isFinalized && latestFinalized?.periodEndStr === periodEnd;

  return (
    <div className="payroll-dashboard-wrapper">
      <PayrollSummaryCards
        stats={stats}
        periodStart={periodStart}
        periodEnd={periodEnd}
        setPeriodEnd={setPeriodEnd}
        onExportWPS={() => handleExportExcel()}
      />

      {/* Modern Tabs Switcher (Design only) */}
      <div className="payroll-premium-tabs">
          <button 
            className={`tab-pill ${activeTab === 'Payroll' ? 'active' : ''}`}
            onClick={() => setActiveTab('Payroll')}
          >
            Dashboard & Payroll
          </button>
          <button 
            className={`tab-pill ${activeTab === 'Location report' ? 'active' : ''}`}
            onClick={() => setActiveTab('Location report')}
          >
            Location report
          </button>
          <button 
            className={`tab-pill ${activeTab === 'Visa report' ? 'active' : ''}`}
            onClick={() => setActiveTab('Visa report')}
          >
            Visa report
          </button>
      </div>

      {activeTab === 'Payroll' && (
        <>
            {/* Action Bar (Original Logic + New Style) */}
            <div className="payroll-action-row">
                 <div className={`action-step ${isGenerated ? 'active completed' : 'active'}`}>
                    <span className="step-num">{isGenerated ? '✓' : '1'}</span>
                    <div className="step-txt">
                        <span className="step-label">Generate</span>
                        <span className="step-desc">{isGenerated ? 'Successfully generated' : 'Process current month'}</span>
                    </div>
                 </div>
                 <div className={`separator ${isGenerated ? 'active' : ''}`} />
                 <div className={`action-step ${isFinalized ? 'active completed' : isGenerated ? 'active' : ''}`}>
                    <span className="step-num">{isFinalized ? '✓' : '2'}</span>
                    <div className="step-txt">
                        <span className="step-label">Finalize</span>
                        <span className="step-desc">{isFinalized ? 'Payroll locked' : 'Lock and approve'}</span>
                    </div>
                 </div>
                 
                 <div className="action-btns-group">
                    <button 
                      className="gen-btn" 
                      onClick={handleGenerate} 
                      disabled={loading || isFinalized}
                    >
                        {loading ? 'Processing...' : isGenerated ? 'Regenerate' : 'Generate Payroll'}
                    </button>
                    <button
                      className="final-btn"
                      onClick={() => setShowFinalizeConfirm(true)}
                      disabled={loading || !isGenerated || isFinalized}
                    >
                        {isFinalized ? 'Finalized' : 'Finalize Payroll'}
                    </button>
                    {isFinalized && (
                      <button
                        className="final-btn"
                        style={{ background: '#fff', color: '#b91c1c', border: '1px solid #b91c1c' }}
                        onClick={() => setShowUnfinalizeConfirm(true)}
                        disabled={loading || !canUnfinalize}
                        title={canUnfinalize ? "Undo finalize for this period" : "Only the most recently finalized period can be un-finalized"}
                      >
                          Un-finalize
                      </button>
                    )}
                 </div>
            </div>

            {/* Charts Grid (Commented out for now) */}
            {/* <div className="payroll-charts-grid">
                <EmployeePayrollOverviewChart data={mockTrends} />
                <LoansAdvancesChart 
                    data={mockLoans} 
                    total={mockLoans.reduce((s, a) => s + a.value, 0)} 
                />
            </div> */}

            {/* Payroll List Section */}
            <div className="payroll-list-container">
                <div className="list-header">
                    <h2 className="list-title">Payroll List</h2>
                    <p className="list-subtitle">Detailed monthly payroll records</p>
                </div>

                <p className="filter-label">Filter payroll list by:</p>
                
                <PayrollFilters
                    filters={filters}
                    setFilters={setFilters}
                    companies={companies}
                    branches={branches}
                />

                <PayrollEmployeesTable
                    employees={records}
                    loading={loading}
                    onRefresh={fetchPayroll}
                    isFinalized={isFinalized}
                    companies={companies}
                />

                <PayrollPagination
                    pagination={pagination}
                    onPageChange={(pg) => setFilters(f => ({ ...f, page: pg }))}
                />
            </div>

            {/* WPS Compliance Tools (Original Component Layout in New Design) */}
            <div className="wps-compliance-section">
                <div className="wps-header">
                    <SvgIcon name="document" size={18} />
                    <h3>WPS Compliance Tools</h3>
                </div>
                <div className="wps-tools-grid">
                    <div className="wps-tool-card" onClick={handleGenerateSIF}>
                        <div className="tool-icon-box blue"><SvgIcon name="dollar" size={20} /></div>
                        <div className="tool-content">
                            <h4>Generate SIF File</h4>
                            <p>Create salary payment file for banks</p>
                        </div>
                    </div>
                    <div className="wps-tool-card" onClick={handleGenerateMOL}>
                        <div className="tool-icon-box green"><SvgIcon name="reports" size={20} /></div>
                        <div className="tool-content">
                            <h4>MOL Report</h4>
                            <p>Ministry of Labour compliance report</p>
                        </div>
                    </div>
                    <div className="wps-tool-card" onClick={handlePaymentHistory}>
                        <div className="tool-icon-box orange"><SvgIcon name="clock (1)" size={20} /></div>
                        <div className="tool-content">
                            <h4>Payment History</h4>
                            <p>View past payroll transactions</p>
                            <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                                <select
                                    value={historyYear}
                                    onChange={(e) => setHistoryYear(Number(e.target.value))}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{ fontSize: '12px', padding: '2px 4px' }}
                                >
                                    {Array.from({ length: 6 }, (_, i) => today.getFullYear() - i).map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                                <select
                                    value={historyMonth}
                                    onChange={(e) => setHistoryMonth(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{ fontSize: '12px', padding: '2px 4px' }}
                                >
                                    <option value="">All months</option>
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                        <option key={m} value={m}>{new Date(2000, m - 1, 1).toLocaleString('en', { month: 'long' })}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
      )}

      {activeTab === 'Location report' && (
        <div className="payroll-list-container">
            <div className="list-header">
                <h2 className="list-title">Location Report</h2>
                <p className="list-subtitle">Analysis filtered by location</p>
            </div>
            
            <PayrollFilters
                filters={filters}
                setFilters={setFilters}
                companies={companies}
                branches={branches}
            />

            <WorkReportTable 
                records={allRecords} 
                reportType="permit" 
                loading={loading} 
                onExport={() => handleExportExcel('permit')} 
            />
        </div>
      )}

      {activeTab === 'Visa report' && (
        <div className="payroll-list-container">
            <div className="list-header">
                <h2 className="list-title">Visa Report</h2>
                <p className="list-subtitle">Analysis filtered by visa company</p>
            </div>

            <PayrollFilters
                filters={filters}
                setFilters={setFilters}
                companies={companies}
                branches={branches}
            />

            <WorkReportTable
                records={allRecords}
                reportType="visa"
                loading={loading}
                onExport={() => handleExportExcel('visa')}
            />
        </div>
      )}

      <CustomModal
        show={showFinalizeConfirm}
        title="Finalize Payroll"
        onClose={() => { setShowFinalizeConfirm(false); setFinalizeConfirmText(""); }}
        footer={
          <>
            <CustomButton
              variant="secondary"
              onClick={() => { setShowFinalizeConfirm(false); setFinalizeConfirmText(""); }}
              className="bg-gray-200 text-gray-700 hover:bg-gray-300"
            >
              Cancel
            </CustomButton>
            <CustomButton onClick={handleConfirmFinalize} disabled={finalizeConfirmText.trim().toLowerCase() !== "yes"}>
              Finalize Payroll
            </CustomButton>
          </>
        }
      >
        <p style={{ marginBottom: "12px", color: "#374151" }}>
          This locks payroll for {periodStart} to {periodEnd}. It cannot be undone from here — loan and advance
          requests will be updated and no further edits will be possible.
        </p>
        <label style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "6px" }}>
          Type <strong>Yes</strong> to confirm
        </label>
        <input
          type="text"
          value={finalizeConfirmText}
          onChange={(e) => setFinalizeConfirmText(e.target.value)}
          placeholder="Yes"
          style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "14px" }}
          autoFocus
        />
      </CustomModal>

      <CustomModal
        show={showUnfinalizeConfirm}
        title="Un-finalize Payroll"
        onClose={() => { setShowUnfinalizeConfirm(false); setUnfinalizeConfirmText(""); }}
        footer={
          <>
            <CustomButton
              variant="secondary"
              onClick={() => { setShowUnfinalizeConfirm(false); setUnfinalizeConfirmText(""); }}
              className="bg-gray-200 text-gray-700 hover:bg-gray-300"
            >
              Cancel
            </CustomButton>
            <CustomButton onClick={handleConfirmUnfinalize} disabled={unfinalizeConfirmText.trim().toLowerCase() !== "yes"}>
              Un-finalize Payroll
            </CustomButton>
          </>
        }
      >
        <p style={{ marginBottom: "12px", color: "#374151" }}>
          This unlocks payroll for {periodStart} to {periodEnd} back to a draft — it also reverses any loan/salary-advance
          repayments that this finalize recorded. Only use this to correct a mistake; a new Finalize will be
          needed once the period is fixed.
        </p>
        <label style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "6px" }}>
          Type <strong>Yes</strong> to confirm
        </label>
        <input
          type="text"
          value={unfinalizeConfirmText}
          onChange={(e) => setUnfinalizeConfirmText(e.target.value)}
          placeholder="Yes"
          style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "14px" }}
          autoFocus
        />
      </CustomModal>
    </div>
  );
}

export default Payroll;
