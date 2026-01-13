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

const ASSET_API = "/api/assets";

// ✅ Assign asset to employee
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
