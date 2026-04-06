import api from "../api/apiClient";

const BASE_URL = "/api/announcements";

export const announcementService = {
  getAll: async () => (await api.get(BASE_URL)).data,
  create: async (payload) => (await api.post(BASE_URL, payload)).data,
  delete: async (id) => (await api.delete(`${BASE_URL}/${id}`)).data
};
