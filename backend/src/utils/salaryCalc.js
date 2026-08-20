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

// Splits any amount 50/30/20 into basic/hra/allowance shares. Used two ways by callers:
// (1) approveAppraisal passes the full NEW GROSS (old total + increment) to fully
// re-derive basicSalary/hra/allowance as an exact 50/30/20 split - not add a 50/30/20
// split of just the increment onto whatever those fields already held, which let them
// drift off-ratio over repeated increments. visaBase/workBase are NEVER split - they
// receive the full increment amount unsplit (separate visa/labour-filing figures, no
// "HRA visa base" concept, splitting them would silently shrink the compliance-facing
// salary bump). Remainder-based rounding (allowance = amount - the other two, not its
// own independent rounding) so the three shares always sum exactly to `amount`.
export const splitIncrement = (incrementAmount) => {
  const amount = toNumber(incrementAmount);
  const basicDelta = Math.round(amount * 0.5 * 100) / 100;
  const hraDelta = Math.round(amount * 0.3 * 100) / 100;
  const allowanceDelta = Math.round((amount - basicDelta - hraDelta) * 100) / 100;
  return { basicDelta, hraDelta, allowanceDelta };
};
