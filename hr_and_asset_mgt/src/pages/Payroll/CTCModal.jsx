import CustomModal from "../../components/reusable/CustomModal.jsx";

const currency = (value) => `${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AED`;

export default function CTCModal({ show, onClose, record }) {
  if (!record) return null;

  const employee = record.employee || {};
  const currentSalary = [...(employee.salaryHistory || [])]
    .sort((a, b) => new Date(b.effectiveDate) - new Date(a.effectiveDate))[0];

  const items = [
    { label: "Payroll Base (Visa Base)", value: currency(employee.visaBase || currentSalary?.visaBase || record.basicSalary) },
    { label: "Work Base", value: currency(employee.workBase || currentSalary?.workBase || record.basicSalary) },
    { label: "Current CTC", value: currency(employee.ctc || currentSalary?.ctc || employee.workBase || record.basicSalary) },
    { label: "Gross Earnings", value: currency((record.basicSalary || 0) + (record.totalAllowances || 0)) },
    { label: "Total Deductions", value: currency(record.totalDeductions || 0) },
    { label: "Net Salary", value: currency(record.netSalary || 0) }
  ];

  return (
    <CustomModal show={show} title="View CTC" onClose={onClose} width="760px" className="payroll-ctc-modal-shell">
      <div className="payroll-ctc-modal">
        <div className="payroll-ctc-hero">
          <div>
            <div className="payroll-ctc-name">{employee.name}</div>
            <div className="payroll-ctc-subtitle">{employee.code} • {employee.designation || employee.department || "Employee"}</div>
          </div>
          <div className="payroll-ctc-pill">
            Net Salary
            <strong>{currency(record.netSalary || 0)}</strong>
          </div>
        </div>

        <div className="payroll-ctc-grid">
          {items.map((item) => (
            <div key={item.label} className="payroll-ctc-card">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>

        {currentSalary && (
          <div className="payroll-ctc-timeline">
            Effective from {new Date(currentSalary.effectiveDate).toLocaleDateString()} via {currentSalary.salaryType?.replace(/_/g, " ") || "salary history"}.
          </div>
        )}
      </div>
    </CustomModal>
  );
}
