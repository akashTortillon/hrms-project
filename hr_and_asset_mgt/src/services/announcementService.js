import api from "../api/apiClient";

const BASE_URL = "/announcements";

export const announcementService = {
  getAll: async (filters = {}) => {
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v && v !== "ALL")
    );
    return (await api.get(BASE_URL, { params })).data;
  },

  // Supports FormData (with image) or plain object
  create: async (payload) => {
    const isFormData = payload instanceof FormData;
    return (
      await api.post(BASE_URL, payload, {
        headers: isFormData ? { "Content-Type": "multipart/form-data" } : {}
      })
    ).data;
  },

  delete: async (id) => (await api.delete(`${BASE_URL}/${id}`)).data
};
