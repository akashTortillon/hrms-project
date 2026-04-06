import api from "../api/apiClient";

const BASE_URL = "/api/appraisals";

export const appraisalService = {
  getCycles: async () => (await api.get(`${BASE_URL}/cycles`)).data,
  createCycle: async (payload) => (await api.post(`${BASE_URL}/cycles`, payload)).data,
  getAll: async (params = {}) => (await api.get(BASE_URL, { params })).data,
  create: async (payload) => (await api.post(BASE_URL, payload)).data,
  approve: async (id, payload) => (await api.post(`${BASE_URL}/${id}/approve`, payload)).data,
  reject: async (id) => (await api.post(`${BASE_URL}/${id}/reject`)).data
};
