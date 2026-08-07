import api from "../api/apiClient";

const EMPLOYEE_API = "/employees";

// ✅ Fetch employees
export const getEmployees = async (params = {}) => {
  const res = await api.get(EMPLOYEE_API, { params });
  return res.data;
};

// Fetch the logged-in user's own employee profile via the dedicated /me endpoint.
// More reliable than getEmployeeById("undefined") — works even when employeeId
// is not yet stored in the User document.
export const getMyProfile = async () => {
  const res = await api.get(`${EMPLOYEE_API}/me`);
  return res.data;
};

export const getEmployeeById = async (id) => {
  const res = await api.get(`${EMPLOYEE_API}/${id}`);
  return res.data;
};

// ✅ Add employee
export const addEmployee = async (employee) => {
  const res = await api.post(EMPLOYEE_API, employee);
  return res.data;
};

// UPDATE employee
export const updateEmployee = async (id, data) => {
  const res = await api.put(EMPLOYEE_API + `/${id}`, data);
  return res.data.employee;
};

export const uploadEmployeePhoto = async (id, formData) => {
  const res = await api.post(`${EMPLOYEE_API}/${id}/photo`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.employee;
};

export const transferEmployee = async (id, data) => {
  const res = await api.post(`${EMPLOYEE_API}/${id}/transfer`, data);
  return res.data;
};

export const confirmProbation = async (id, data = {}) => {
  const res = await api.post(`${EMPLOYEE_API}/${id}/confirm-probation`, data);
  return res.data;
};

export const getProbationReminders = async () => {
  const res = await api.get(`${EMPLOYEE_API}/probation/reminders`);
  return res.data;
};

// DELETE employee
export const deleteEmployee = async (id) => {
  const res = await api.delete(EMPLOYEE_API + `/${id}`);
  return res.data;
};

// DELETE a single ad-hoc allowance entry
export const deleteAllowance = async (employeeId, allowanceId) => {
  const res = await api.delete(`${EMPLOYEE_API}/${employeeId}/allowances/${allowanceId}`);
  return res.data.employee;
};

// RESET PASSWORD
export const resetEmployeePassword = async (id) => {
  const res = await api.put(`${EMPLOYEE_API}/${id}/reset-password`);
  return res.data;
};

// EXPORT employees (Excel)
export const exportEmployees = async (params = {}) => {
  const res = await api.get(EMPLOYEE_API + "/export", {
    params,
    responseType: 'blob'
  });
  return res.data;
};

// IMPORT employees (Excel/CSV)
export const importEmployees = async (formData) => {
  const res = await api.post(EMPLOYEE_API + "/import", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

// PREVIEW shift import (Excel) - Admin only
export const previewShiftImport = async (formData) => {
  const res = await api.post(EMPLOYEE_API + "/import-shifts/preview", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

// APPLY shift import (Excel) - Admin only
export const applyShiftImport = async (formData) => {
  const res = await api.post(EMPLOYEE_API + "/import-shifts/apply", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

const DOC_API = "/employee-docs";

export const getEmployeeDocuments = async (employeeId) => {
  const res = await api.get(`${DOC_API}/${employeeId}`);
  return res.data;
};

export const uploadEmployeeDocument = async (formData) => {
  const res = await api.post(DOC_API, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const deleteEmployeeDocument = async (docId) => {
  const res = await api.delete(`${DOC_API}/${docId}`);
  return res.data;
};

// GET gratuity calculation for an employee
export const getEmployeeGratuity = async (id) => {
  const res = await api.get(`${EMPLOYEE_API}/${id}/gratuity`);
  return res.data;
};
