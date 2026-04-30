import api from "../api/apiClient";

const BASE = "/activity-logs";

export const getActivityLogs = async (params = {}) => {
  const res = await api.get(BASE, { params });
  return res.data;
};

export const getActivityStats = async () => {
  const res = await api.get(`${BASE}/stats`);
  return res.data;
};

export const exportActivityLogs = async (params = {}) => {
  const res = await api.get(BASE, {
    params: { ...params, export: "true" },
    responseType: "blob"
  });
  return res.data;
};

export const clearOldLogs = async (olderThanDays = 90) => {
  const res = await api.delete(`${BASE}/clear`, { data: { olderThanDays } });
  return res.data;
};
