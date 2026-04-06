import api from "../api/apiClient";

const BASE_URL = "/api/policies";

export const policyService = {
  getAll: async () => (await api.get(BASE_URL)).data,
  upload: async (formData) => (await api.post(BASE_URL, formData, {
    headers: { "Content-Type": "multipart/form-data" }
  })).data,
  delete: async (id) => (await api.delete(`${BASE_URL}/${id}`)).data
};
