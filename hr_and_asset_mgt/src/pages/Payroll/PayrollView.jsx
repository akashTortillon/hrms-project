import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import Card from "../../components/reusable/Card.jsx";
import SvgIcon from "../../components/svgIcon/svgView";
import PayrollSummaryCards from "./PayrollCards";
import PayrollEmployeesTable from "./PayrollTable";
import { EmployeePayrollOverviewChart, LoansAdvancesChart } from "./PayrollCharts";
import { payrollService } from "../../services/payrollService";
import { getCompanies, getBranches } from "../../services/masterService.js";

// Reusable filter section (Original logic + New Style)
function PayrollFilters({ filters, setFilters, companies, branches }) {
  return (
    <div className="payroll-filter-section">
      <div className="filter-group">
        <label>Company</label>
        <select
          value={filters.company || ''}
          onChange={e => setFilters(f => ({ ...f, company: e.target.value, page: 1 }))}
        >
          <option value="">All Companies</option>
          {companies.map(c => <option key={c._id || c.name} value={c.name}>{c.name}</option>)}
        </select>
      </div>

      <div className="filter-group">
        <label>Branch</label>
        <select
          value={filters.branch || ''}
          onChange={e => setFilters(f => ({ ...f, branch: e.target.value, page: 1 }))}
        >
          <option value="">All Branches</option>
          {branches.map(b => <option key={b._id || b.name} value={b.name}>{b.name}</option>)}
        </select>
      </div>

      <div className="filter-group">
        <label>Search name</label>
        <input
          type="text"
          placeholder="Enter name"
          value={filters.search || ''}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
        />
      </div>

      <button className="filter-btn-primary" onClick={() => setFilters(f => ({...f, page: 1}))}>Filter</button>
    </div>
  );
}

// Work Permit / Visa Report Table (Original columns + New Style)
function WorkReportTable({ records, reportType, loading, onExport }) {
  const companyKey = reportType === 'permit' ? 'workPermitCompany' : 'visaCompany';
  const label = reportType === 'permit' ? 'Location' : 'Visa';

  const filtered = records.filter(r => r.employee?.[companyKey]);

  return (
    <div className="payroll-list-container">
       <div className="list-header" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <div>
                   <h2 className="list-title">{label} Report</h2>
                   <p className="list-subtitle">Employee list filtered by {reportType === 'permit' ? 'location' : 'visa'}</p>
                </div>
                <button className="export-record-btn" onClick={onExport}>
                    <SvgIcon name="download" size={14} />
                    Export Excel
                </button>
            </div>
        </div>

      <div className="payroll-list-table-wrapper">
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

function Payroll() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState('Payroll');
  const [records, setRecords] = useState([]);
  const [allRecords, setAllRecords] = useState([]); // unfiltered for report tabs
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({});
  const [pagination, setPagination] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [branches, setBranches] = useState([]);
  const [filters, setFilters] = useState({ company: '', branch: '', search: '', page: 1, limit: 10 });

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
  }, []);

  useEffect(() => {
    fetchPayroll();
  }, [month, year, filters]);

  useEffect(() => {
    if (activeTab !== 'Payroll') {
      fetchAllRecords();
    }
  }, [activeTab, month, year]);

  const fetchPayroll = async () => {
    try {
      setLoading(true);
      const data = await payrollService.getSummary(month, year, filters);
      setRecords(data.records || []);
      setStats(data.stats || {});
      setPagination(data.pagination || null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch payroll summary");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllRecords = async () => {
    try {
      setLoading(true);
      const data = await payrollService.getSummary(month, year, { limit: 1000 });
      setAllRecords(data.records || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    try {
      setLoading(true);
      await payrollService.generate(month, year);
      toast.success("Payroll Generated Successfully!");
      fetchPayroll();
    } catch (error) {
      toast.error("Failed to generate payroll");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    try {
      setLoading(true);
      await payrollService.finalize(month, year);
      toast.success("Payroll Finalized & Locked!");
      fetchPayroll();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to finalize");
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async (reportType = null) => {
    try {
      await payrollService.exportExcel(month, year, reportType);
      toast.success("Export Downloaded!");
    } catch (error) {
      toast.error("Export failed.");
    }
  };

  const handleGenerateSIF = async () => {
    try {
      await payrollService.generateSIF(month, year);
      toast.success("SIF File Generated!");
    } catch (error) {
      toast.error("SIF Generation failed.");
    }
  };

  const handleGenerateMOL = async () => {
    try {
      await payrollService.downloadMOLReport(month, year);
      toast.success("MOL Report Downloaded!");
    } catch (error) {
      toast.error("Failed to download MOL Report");
    }
  };

  const handlePaymentHistory = async () => {
    try {
      await payrollService.downloadPaymentHistory(year);
      toast.success(`Payment History for ${year} Downloaded!`);
    } catch (error) {
      toast.error("Failed to download History");
    }
  };

  // Derive state guards
  const isGenerated = records.length > 0;
  const isFinalized = isGenerated && records.every(r => r.status === 'PROCESSED' || r.status === 'PAID');

  return (
    <div className="payroll-dashboard-wrapper">
      <PayrollSummaryCards
        stats={stats}
        month={month}
        year={year}
        setMonth={setMonth}
        setYear={setYear}
        onExportWPS={handleGenerateSIF}
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
                      onClick={handleFinalize} 
                      disabled={loading || !isGenerated || isFinalized}
                    >
                        {isFinalized ? 'Finalized' : 'Finalize Payroll'}
                    </button>
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
                        </div>
                    </div>
                </div>
            </div>
        </>
      )}

      {activeTab === 'Location report' && (
        <WorkReportTable 
            records={allRecords} 
            reportType="permit" 
            loading={loading} 
            onExport={() => handleExportExcel('permit')} 
        />
      )}

      {activeTab === 'Visa report' && (
        <WorkReportTable 
            records={allRecords} 
            reportType="visa" 
            loading={loading} 
            onExport={() => handleExportExcel('visa')} 
        />
      )}
    </div>
  );
}

export default Payroll;
