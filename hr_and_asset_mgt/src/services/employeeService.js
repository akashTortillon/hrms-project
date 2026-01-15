// const API_URL = import.meta.env.VITE_API_BASE + "/employees";

// export const getEmployees = async () => {
//   const res = await fetch(API_URL);
//   if (!res.ok) throw new Error("Failed to fetch employees");
//   return res.json();
// };

// export const addEmployee = async (employee) => {
//   const res = await fetch(API_URL, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(employee),
//   });

//   const data = await res.json();

//   if (!res.ok) throw new Error(data.message);
//   return data.employee; // matches your controller response
// };


// import axios from "axios";

// // Create axios instance with base URL
// const api = axios.create({
//   baseURL: import.meta.env.VITE_API_BASE,
//   headers: {
//     "Content-Type": "application/json",
//   },
// });

// // Add request interceptor to include auth token
// api.interceptors.request.use((config) => {
//   const token = localStorage.getItem("token");
//   if (token) {
//     config.headers.Authorization = `Bearer ${token}`;
//   }
//   return config;
// });

// const API_BASE = "/api/employees";

// export const getEmployees = () => api.get(`${API_BASE}`);
// export const addEmployee = (data) => api.post(`${API_BASE}`, data);


import axios from "axios";

// axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach token if exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const EMPLOYEE_API = "/api/employees";

// ✅ Fetch employees
export const getEmployees = async (params = {}) => {
  const res = await api.get(EMPLOYEE_API, { params });
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

