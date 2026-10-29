// True while the employee is still on probation on `dateStr` (probation end date not yet
// passed and not marked CONFIRMED). Shared by payroll (leave pay status) and leave
// requests/wallets (which leave types a probationer may use).
export const isEmployeeOnProbation = (employee, dateStr) => {
  if (!employee?.probationEndDate) return false;
  if (employee.probationStatus === "CONFIRMED") return false;
  const checkDate = new Date(dateStr);
  return checkDate <= new Date(employee.probationEndDate);
};

// A leave type is available to probationers unless HR unticked "Include in probation?"
// on it. Strict === false so legacy types (flag never set) stay available.
export const isLeaveTypeAllowedInProbation = (leaveType) =>
  leaveType?.metadata?.includeInProbation !== false;
