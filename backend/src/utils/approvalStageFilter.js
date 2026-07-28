// A request's overall `status` stays "PENDING" through its entire
// Manager -> Finance -> HR lifecycle (see requestController.js's createRequest,
// currentApprovalStage). Any "pending requests" query for a specific viewer must also
// scope by currentApprovalStage + assignment, or it inflates counts/lists with requests
// still awaiting someone else's action at an earlier stage. Mirrors the scoping logic
// in requestController.js's getPendingRequestsForAdmin, shared here so dashboard/
// notification widgets can't drift out of sync with the real approval queue.
export const getApprovalStageFilter = (user = {}) => {
  const isHrApprover = user.role === "Admin"
    || /^HR/i.test(user.role || "")
    || user.permissions?.includes("ALL")
    || user.permissions?.includes("APPROVE_REQUESTS");
  const canApproveFinance = user.role === "Finance Manager"
    || /^Finance/i.test(user.role || "")
    || user.permissions?.includes("APPROVE_FINANCE_REQUESTS")
    || user.permissions?.includes("ALL");
  const canApproveManager = user.role === "Manager"
    || user.permissions?.includes("APPROVE_MANAGER_REQUESTS");

  const approverScope = [user._id, user.employeeId].filter(Boolean);
  const stageFilters = [];

  if (isHrApprover) {
    stageFilters.push({ currentApprovalStage: "HR" });
    stageFilters.push({
      currentApprovalStage: "MANAGER",
      ...(canApproveManager ? { designatedManager: { $in: approverScope } } : {})
    });
    stageFilters.push({
      currentApprovalStage: "FINANCE",
      ...(canApproveFinance ? { designatedFinanceManager: { $in: approverScope } } : {})
    });
  } else {
    if (canApproveManager) {
      stageFilters.push({ currentApprovalStage: "MANAGER", designatedManager: { $in: approverScope } });
    }
    if (canApproveFinance) {
      stageFilters.push({ currentApprovalStage: "FINANCE", designatedFinanceManager: { $in: approverScope } });
    }
  }

  return stageFilters;
};
