import axios from "axios";

// Create axios instance with base URL
const api = axios.create({
  //baseURL: "http://localhost:5000", // Adjust to your backend URL
  baseURL: import.meta.env.VITE_API_BASE, // Adjust to your backend URL
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const API_BASE = "/api/dashboard";

export const fetchMetrics = () => api.get(`${API_BASE}/metrics`);
export const fetchCompanyDocuments = () => api.get(`${API_BASE}/company-documents`);
export const fetchEmployeeVisas = () => api.get(`${API_BASE}/employee-visas`);
export const fetchPendingApprovals = () => api.get(`${API_BASE}/pending-approvals`);
export const fetchTodaysAttendance = () => api.get(`${API_BASE}/attendance`);