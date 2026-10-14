export const toNumber = (value) => Number(String(value || 0).replace(/[^0-9.-]+/g, "")) || 0;

// Resolves an employee's effective basic/visa/work/ctc salary as of the given payroll
// month/year, walking salaryHistory for the most recent entry effective on or before
// that period. Shared by payrollController (payroll generation) and leaveWalletController
// (advance-leave deduction/refund amounts) so both always agree on "current daily rate".
export const resolveEffectiveSalary = (employee, month, year) => {
  const periodEnd = new Date(year, month, 0, 23, 59, 59, 999);
  const history = [...(employee.salaryHistory || [])]
    .filter(entry => entry.effectiveDate && new Date(entry.effectiveDate) <= periodEnd)
    .sort((a, b) => new Date(b.effectiveDate) - new Date(a.effectiveDate));

  const latest = history[0];
  if (latest) {
    return {
      basicSalary: toNumber(latest.basicSalary),
      visaBase: toNumber(latest.visaBase || latest.basicSalary),
      workBase: toNumber(latest.workBase || latest.basicSalary),
      ctc: toNumber(latest.ctc || latest.workBase || latest.basicSalary)
    };
  }

  return {
    basicSalary: toNumber(employee.basicSalary),
    visaBase: toNumber(employee.visaBase || employee.basicSalary),
    workBase: toNumber(employee.workBase || employee.basicSalary),
    ctc: toNumber(employee.ctc || employee.workBase || employee.basicSalary)
  };
};

// Daily rate for absence/leave deductions: a full day's salary = Total Salary (basic + HRA
// + fixed allowance, no accommodation/vehicle) / 30 - same rate generatePayroll uses for
// absent / unpaid-leave days.
export const getDailySalary = (employee, month, year) => {
  const effective = resolveEffectiveSalary(employee, month, year);
  const basicSalary = effective.basicSalary || effective.visaBase;
  return (basicSalary + toNumber(employee.hra) + toNumber(employee.allowance)) / 30;
};
