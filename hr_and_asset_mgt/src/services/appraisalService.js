import api from "../api/apiClient";

const BASE_URL = "/appraisals";

const createCycleName = (type) => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const label = type === "ALLOWANCE" ? "Allowance Adjustment" : "Increment Adjustment";
  return `${label} ${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
};

export const appraisalService = {
  getCycles: async () => (await api.get(`${BASE_URL}/cycles`)).data,
  createCycle: async (payload) => (await api.post(`${BASE_URL}/cycles`, payload)).data,
  getAll: async (params = {}) => (await api.get(BASE_URL, { params })).data,
  create: async (payload) => (await api.post(BASE_URL, payload)).data,
  approve: async (id, payload) => (await api.post(`${BASE_URL}/${id}/approve`, payload)).data,
  reject: async (id) => (await api.post(`${BASE_URL}/${id}/reject`)).data,

  // Shared create-cycle -> create -> approve chain used by both the Appraisals page
  // (salary increments) and the Employee Detail "+ Add Allowance" action, so the
  // instant-apply flow lives in one place instead of being duplicated per screen.
  applyAdjustment: async ({ employee, type = "SALARY", allowanceTypeName = "", amount, effectiveDate, notes, includeInPayroll = true }) => {
    const cycle = await appraisalService.createCycle({
      name: createCycleName(type),
      startDate: effectiveDate,
      endDate: effectiveDate,
      status: "ACTIVE"
    });

    const appraisal = await appraisalService.create({
      employee,
      cycle: cycle._id,
      type,
      allowanceTypeName,
      recommendedIncrement: amount,
      effectiveDate,
      // Only pass includeInPayroll for ALLOWANCE type; for SALARY it is irrelevant
      // but harmless to include (the backend ignores it in the SALARY branch).
      includeInPayroll,
      comments: type === "ALLOWANCE" ? `Allowance: ${allowanceTypeName}` : "Manual appraisal adjustment"
    });

    return appraisalService.approve(appraisal._id, {
      approvedIncrement: amount,
      effectiveDate,
      notes: notes || (type === "ALLOWANCE" ? `Allowance (${allowanceTypeName}) applied` : "Applied from Salary Increment & Appraisal screen")
    });
  }
};
