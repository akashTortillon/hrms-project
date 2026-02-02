import { useState } from "react";
import api from "../../api/apiClient";
import { toast } from "react-toastify"; // Added toast import if not present, though assuming toast might be needed for errors.
import Card from "../../components/reusable/Card";
import SvgIcon from "../../components/svgIcon/svgView";
import "../../style/Reports.css";

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

export default function ComplianceExports() {
  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());

  const handleExport = async (type) => {
    let url = "";
    if (type === "wps") {
      url = `/api/reports/compliance/wps-sif?month=${month}&year=${year}`;
    } else if (type === "mol") {
      url = `/api/reports/compliance/mol-report?month=${month}&year=${year}`;
    }

    if (url) {
      try {
        const response = await api.get(url, { responseType: 'blob' });
        const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = blobUrl;
        // Extract filename from header if possible, or generate one
        const filename = type === "wps" ? `WPS_SIF_${month}_${year}.sif` : `MOL_Report_${month}_${year}.xlsx`;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } catch (error) {
        console.error("Export failed", error);
        // toast.error("Export failed"); // Ideally add toast
      }
    }
  };

  return (
    <Card className="compliance-card">
      {/* Header */}
      <div className="compliance-header-text" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <SvgIcon name="document" size={24} />
          <h3 style={{ margin: 0 , fontSize:"20px"}}>Compliance & Government Exports</h3>
        </div>

        <div className="report-filters" style={{ marginBottom: 0 }}>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[0, 1, 2, 3, 4].map(i => <option key={i} value={currentDate.getFullYear() - i}>{currentDate.getFullYear() - i}</option>)}
          </select>
        </div>
      </div>

      {/* Export items */}
      <div className="compliance-grid">
        <div className="compliance-item" onClick={() => handleExport("wps")}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <h4 className="compliance-item-title">WPS Salary File (SIF)</h4>
            <SvgIcon name="download" size={18} />
          </div>
          <p className="compliance-item-desc">Generate standard SIF format for UAE bank submission.</p>
        </div>

        <div className="compliance-item" onClick={() => handleExport("mol")}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <h4 className="compliance-item-title">MOL Compliance Report</h4>
            <SvgIcon name="download" size={18} />
          </div>
          <p className="compliance-item-desc">Ministry of Labour salary information report (Excel).</p>
        </div>

        <div className="compliance-item" style={{ opacity: 0.6, cursor: 'not-allowed' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <h4 className="compliance-item-title">End of Service Report</h4>
            <SvgIcon name="lock" size={18} />
          </div>
          <p className="compliance-item-desc">Calculate gratuity and benefits (Coming Soon).</p>
        </div>
      </div>
    </Card>
  );
}
