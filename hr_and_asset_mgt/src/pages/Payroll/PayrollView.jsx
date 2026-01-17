

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

  return (
    <div>
      {/* Date Selector could go here */}
      <PayrollSummaryCards
        stats={stats}
        month={month}
        year={year}
        setMonth={setMonth}
        setYear={setYear}
      />

      <PayrollStatus
        onGenerate={handleGenerate}
        loading={loading}
        status={records.length > 0 ? (records[0].status === 'PROCESSED' ? 2 : 1) : 0}
      />

      <PayrollEmployeesTable employees={records} loading={loading} />

      <div className="wps-section">

        <h5 className="wps-title"><SvgIcon name="document" size={20} /> WPS Compliance Tools</h5>


        <div className="wps-card-grid">
          <Card
            title="Generate SIF File"
            subtitle="Create salary payment file for banks"
            className="wps-card"
          />

          <Card
            title="MOL Report"
            subtitle="Ministry of Labour compliance report"
            className="wps-card"
          />

          <Card
            title="Payment History"
            subtitle="View past payroll transactions"
            className="wps-card"
          />
        </div>
      </div>
    </div>
  );
}


export default Payroll;