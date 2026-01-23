import api from "../api/apiClient";

const EMPLOYEE_API = "/api/employees";

// ✅ Fetch employees
export const getEmployees = async (params = {}) => {
  const res = await api.get(EMPLOYEE_API, { params });
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

// DELETE employee
export const deleteEmployee = async (id) => {
  const res = await api.delete(EMPLOYEE_API + `/${id}`);
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

const DOC_API = "/api/employee-docs";

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
