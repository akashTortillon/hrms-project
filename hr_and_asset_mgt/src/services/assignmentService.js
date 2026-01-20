// import axios from "axios";

// // axios instance
// const api = axios.create({
//   baseURL: import.meta.env.VITE_API_BASE,
//   headers: {
//     "Content-Type": "application/json",
//   },
// });

// // Attach token if exists
// api.interceptors.request.use((config) => {
//   const token = localStorage.getItem("token");
//   console.log("Token from localStorage:", token ? "exists" : "missing");
//   console.log("Token length:", token?.length || 0);
  
//   if (token) {
//     config.headers.Authorization = `Bearer ${token}`;
//     console.log("Authorization header set:", config.headers.Authorization);
//   } else {
//     console.warn("No token found in localStorage");
//   }
//   return config;
// });

// // Handle response errors
// api.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     console.error("API Error:", error.response?.status, error.response?.data);
    
//     if (error.response?.status === 401) {
//       console.error("Authentication failed - token may be expired");
//       // Optionally redirect to login
//       // window.location.href = '/login';
//     }
    
//     return Promise.reject(error);
//   }
// );


import api from "./getAxiosInstance"; 

const ASSET_API = "/api/assets";

// Assign asset to employee
export const assignAssetToEmployee = async (data) => {
  const res = await api.post(`${ASSET_API}/assign`, data);
  return res.data;
};

// ✅ Transfer asset
export const transferAsset = async (data) => {
  const res = await api.post(`${ASSET_API}/transfer`, data);
  return res.data;
};

// ✅ Return asset to store
export const returnAssetToStore = async (data) => {
  const res = await api.post(`${ASSET_API}/return`, data);
  return res.data;
};

// ✅ Get asset history
export const getAssetHistory = async (assetId) => {
  const res = await api.get(`${ASSET_API}/${assetId}/history`);
  return res.data;
};


// Get current assignment for asset
export const getCurrentAssignment = async (assetId) => {
  const res = await api.get(`${ASSET_API}/${assetId}/assignments/current`);
  return res.data;
};