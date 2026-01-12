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

const REQUEST_API = "/api/requests";

// Create a new request
export const createRequest = async (requestData) => {
  const response = await api.post(REQUEST_API, requestData);
  return response.data;
};

// Get all requests for current user
export const getMyRequests = async () => {
  const response = await api.get(`${REQUEST_API}/my`);
  return response.data;
};

// Withdraw a request
export const withdrawRequest = async (requestId) => {
  const response = await api.patch(`${REQUEST_API}/${requestId}/withdraw`);
  return response.data;
};

