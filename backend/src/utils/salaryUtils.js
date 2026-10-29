export const toNumber = (value) => Number(String(value || 0).replace(/[^0-9.-]+/g, "")) || 0;

// Resolves an employee's effective basic/visa/work/ctc salary as of the given date, walking
// salaryHistory for the most recent entry effective on or before it (same-day entries: the
// newest written wins). Single source of truth - payrollController (payroll generation) and
// leaveWalletController (advance-leave deduction/refund amounts) both use it so they always
// agree. History entries are appended for every manual salary edit (employeeController), so
// an edit is picked up here; the live employee fields are only the fallback when no history
// entry is in range.
export const resolveEffectiveSalaryAsOf = (employee, asOfDate) => {
  const periodEnd = new Date(asOfDate);
  periodEnd.setHours(23, 59, 59, 999);
  const history = [...(employee.salaryHistory || [])]
    .filter(entry => entry.effectiveDate && new Date(entry.effectiveDate) <= periodEnd)
    .sort((a, b) =>
      (new Date(b.effectiveDate) - new Date(a.effectiveDate))
      || (new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    );

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

// Month/year flavour (end of that calendar month).
export const resolveEffectiveSalary = (employee, month, year) =>
  resolveEffectiveSalaryAsOf(employee, new Date(year, month, 0));

// Daily rate for absence/leave deductions: a full day's salary = Total Salary (basic + HRA
// + fixed allowance, no accommodation/vehicle) / 30 - same rate generatePayroll uses for
// absent / unpaid-leave days.
export const getDailySalary = (employee, month, year) => {
  const effective = resolveEffectiveSalary(employee, month, year);
  const basicSalary = effective.basicSalary || effective.visaBase;
  return (basicSalary + toNumber(employee.hra) + toNumber(employee.allowance)) / 30;
};
