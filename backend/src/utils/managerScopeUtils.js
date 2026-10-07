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

// Same check against `designatedFinanceManager` instead - added alongside the
// manager version so isFinanceApprover's stale-snapshot fallback (see
// requestController.js) can share this instead of re-deriving the comparison.
export const isFinanceManagerOfEmployee = (reqUser, employee) => {
  const financeManagerId = employee?.designatedFinanceManager?.toString();
  if (!financeManagerId || !reqUser) return false;
  return (
    financeManagerId === reqUser._id?.toString()
    || financeManagerId === reqUser.id?.toString()
    || (reqUser.employeeId && financeManagerId === reqUser.employeeId.toString())
  );
};

// Single source of truth for "which employees may this requester see in a list/search".
// Returns null for full access (Admin / HR* role / ALL permission - APPROVE_REQUESTS
// deliberately does NOT count, see getEmployees' history), otherwise a Mongo filter
// scoping to the requester's own record plus anyone whose designatedManager /
// designatedFinanceManager is the requester (User._id or linked Employee._id - both
// have been written there historically). With no employeeId and no reports it
// matches nothing, which is the safe default.
export const hasFullEmployeeAccess = (reqUser) => Boolean(
  reqUser
  && (
    reqUser.role === "Admin"
    || /^HR/i.test(reqUser.role || "")
    || reqUser.permissions?.includes("ALL")
  )
);

export const buildEmployeeScopeFilter = (reqUser) => {
  if (hasFullEmployeeAccess(reqUser)) return null;
  const scope = [reqUser?._id, reqUser?.employeeId].filter(Boolean);
  const or = [];
  if (reqUser?.employeeId) or.push({ _id: reqUser.employeeId });
  if (scope.length) {
    or.push({ designatedManager: { $in: scope } });
    or.push({ designatedFinanceManager: { $in: scope } });
  }
  return { $or: or.length ? or : [{ _id: null }] };
};
