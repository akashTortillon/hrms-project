import Card from "../../components/reusable/Card";
import SvgIcon from "../../components/svgIcon/svgView";
import "../../style/Reports.css";

const EXPORTS = [
  {
    id: 1,
    title: "WPS Salary File (SIF)",
    desc: "Generate for bank submission",
  },
  {
    id: 2,
    title: "MOL Report",
    desc: "Ministry of Labour compliance",
  },
  {
    id: 3,
    title: "End of Service Report",
    desc: "Calculate employee benefits",
  },
];

export default function ComplianceExports() {
  return (
    <Card className="compliance-card">
      {/* Header */}
      <div className="compliance-header-text">
        <SvgIcon name="document" size={20} />
        <h3>Compliance Exports</h3>
      </div>

      {/* Export items */}
      <div className="compliance-grid">
        {EXPORTS.map((item) => (
          <div key={item.id} className="compliance-item">
            <h4 className="compliance-item-title">{item.title}</h4>
            <p className="compliance-item-desc">{item.desc}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
