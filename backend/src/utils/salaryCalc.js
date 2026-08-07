export const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  return Number(String(value).replace(/[^0-9.-]+/g, "")) || 0;
};

// Total Salary = Basic + fixed Allowance + HRA only. Accommodation/Vehicle allowances
// feed into CTC (see computeCtc), not Total Salary. Ad-hoc allowances[] entries (added
// via Appraisals > Add Allowance) are payroll-only line items gated by includeInPayroll
// and are intentionally excluded from both Total Salary and CTC.
export const computeTotalSalary = (employee) =>
  toNumber(employee.basicSalary) +
  toNumber(employee.allowance) +
  toNumber(employee.hra);

export const computeCtc = (employee) =>
  computeTotalSalary(employee) +
  toNumber(employee.accommodationAllowance) +
  toNumber(employee.vehicleAllowance);
