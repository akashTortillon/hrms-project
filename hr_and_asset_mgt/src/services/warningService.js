import api from "../api/apiClient";

const BASE = "/warnings";

export const getEmployeeWarnings = async (employeeId) => {
  const res = await api.get(`${BASE}/${employeeId}`);
  return res.data;
};

export const addWarning = async (formData) => {
  const isFormData = formData instanceof FormData;
  const res = await api.post(BASE, formData, {
    headers: isFormData ? { "Content-Type": "multipart/form-data" } : {}
  });
  return res.data;
};

export const updateWarningStatus = async (id, payload) => {
  const res = await api.patch(`${BASE}/${id}/status`, payload);
  return res.data;
};

export const deleteWarning = async (id) => {
  const res = await api.delete(`${BASE}/${id}`);
  return res.data;
};
