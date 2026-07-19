import api from "../api/apiClient";

const BASE = "/leave-wallet";

export const getMyWallets = async () => (await api.get(`${BASE}/my-wallet`)).data;

export const getEmployeeWallets = async (employeeId) =>
  (await api.get(`${BASE}/employee/${employeeId}`)).data;

export const getEmployeeLedger = async (employeeId, leaveTypeId) =>
  (await api.get(`${BASE}/employee/${employeeId}/ledger`, { params: leaveTypeId ? { leaveTypeId } : {} })).data;

export const createMigrationEntry = async (payload) =>
  (await api.post(`${BASE}/migration`, payload)).data;

export const setAllocationOverride = async (employeeId, payload) =>
  (await api.put(`${BASE}/${employeeId}/override`, payload)).data;

export const grantAdvanceLeave = async (employeeId, payload) =>
  (await api.post(`${BASE}/${employeeId}/advance`, payload)).data;

export const clearPendingRefund = async (employeeId, leaveTypeId) =>
  (await api.patch(`${BASE}/${employeeId}/clear-refund`, { leaveTypeId })).data;
