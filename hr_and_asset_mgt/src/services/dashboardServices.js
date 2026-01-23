import api from "../api/apiClient";
const API_BASE = "/api/dashboard";

/**
 * ✅ Used for TOP DASHBOARD METRICS
 * Card 1: Total Employees
 * (others can be added later)
 */
export const fetchMetrics = () =>
  api.get(`${API_BASE}/summary`);

// ⛔ keep dummy / existing services as-is
export const fetchCompanyDocuments = () =>
  api.get(`${API_BASE}/company-documents`);

export const fetchEmployeeVisas = () =>
  api.get(`${API_BASE}/employee-visas`);

export const fetchPendingApprovals = () =>
  api.get(`${API_BASE}/pending-approvals`);

export const fetchTodaysAttendance = () =>
  api.get(`${API_BASE}/attendance`);
