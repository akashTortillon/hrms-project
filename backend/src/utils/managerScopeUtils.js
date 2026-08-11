// Shared "is this the requester's direct report" check. `employee.designatedManager`
// stores an Employee._id (not a User._id) - see the comment on that field in
// employeeModel.js - so a manager can be identified either by their own User._id or
// their linked Employee._id, depending on which one got written there historically.
// This consolidates a pattern that was previously copy-pasted slightly differently in
// 3 places across requestController.js (getLeaveSummary, isManagerApprover,
// isFinanceApprover).
export const isManagerOfEmployee = (reqUser, employee) => {
  const managerId = employee?.designatedManager?.toString();
  if (!managerId || !reqUser) return false;
  return (
    managerId === reqUser._id?.toString()
    || managerId === reqUser.id?.toString()
    || (reqUser.employeeId && managerId === reqUser.employeeId.toString())
  );
};
