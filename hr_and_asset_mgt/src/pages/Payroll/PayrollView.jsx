

import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import Card from "../../components/reusable/Card.jsx";
import SvgIcon from "../../components/svgIcon/svgView";
import PayrollSummaryCards from "./PayrollCards";
import PayrollStatus from "./PayrollStatus";
import PayrollEmployeesTable from "./PayrollTable";
import { payrollService } from "../../services/payrollService";

function Payroll() {
  const [month, setMonth] = useState(1); // Jan
  const [year, setYear] = useState(2026);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ count: 0, totalBasic: 0, totalNet: 0 });

  useEffect(() => {
    fetchPayroll();
  }, [month, year]);

  const fetchPayroll = async () => {
    try {
      setLoading(true);
      const data = await payrollService.getSummary(month, year);
      setRecords(data.records || []);
      setStats(data.stats || {});
    } catch (error) {
      console.error(error);
      // toast.error("Failed to fetch payroll");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    try {
      setLoading(true);
      await payrollService.generate(month, year);
      toast.success("Payroll Generated Successfully!");
      fetchPayroll(); // Refresh list
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
      fetchPayroll(); // Refresh
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to finalize");
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      await payrollService.exportExcel(month, year);
      toast.success("Export Downloaded!");
    } catch (error) {
      console.error(error);
      toast.error("Export failed.");
    }
  };

  const handleGenerateSIF = async () => {
    try {
      await payrollService.generateSIF(month, year);
      toast.success("SIF File Generated!");
    } catch (error) {
      console.error(error);
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

  return (
    <div>
      {/* Date Selector could go here */}
      <PayrollSummaryCards
        stats={stats}
        month={month}
        year={year}
        setMonth={setMonth}
        setYear={setYear}
        onExportWPS={handleGenerateSIF}
      />

      <PayrollStatus
        onGenerate={handleGenerate}
        onFinalize={handleFinalize}
        loading={loading}
        status={records.length > 0 ? (records[0].status === 'PROCESSED' ? 2 : 1) : 0}
      />

      <PayrollEmployeesTable
        employees={records}
        loading={loading}
        onRefresh={fetchPayroll}
        isFinalized={records.length > 0 && records[0].status === 'PROCESSED'}
        onExport={() => handleExportExcel()}
      />

      <div className="wps-section">

        <h5 className="wps-title"><SvgIcon name="document" size={20} /> WPS Compliance Tools</h5>


        <div className="wps-card-grid">
          <div onClick={handleGenerateSIF} style={{ cursor: 'pointer' }}>
            <Card
              title="Generate SIF File"
              subtitle="Create salary payment file for banks"
              className="wps-card"
            />
          </div>

          <div onClick={handleGenerateMOL} style={{ cursor: 'pointer' }}>
            <Card
              title="MOL Report"
              subtitle="Ministry of Labour compliance report"
              className="wps-card"
            />
          </div>

          <div onClick={handlePaymentHistory} style={{ cursor: 'pointer' }}>
            <Card
              title="Payment History"
              subtitle="View past payroll transactions"
              className="wps-card"
            />
          </div>
        </div>
      </div>
    </div>
  );
}


export default Payroll;