// The employee ID shown in exports/reports/payslips is the HRMS-generated system code
// (EMP001, ...). `code` is the free-text code HR types in and can be anything (CMP001,
// "2", K001), so it is only the fallback for older employees that have no systemCode.
export const displayEmployeeCode = (emp) => emp?.systemCode || emp?.code || "";
