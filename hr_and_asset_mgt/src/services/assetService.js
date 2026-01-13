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

// ✅ Fetch all assets
export const getAssets = async () => {
  const res = await api.get(ASSET_API);
  return res.data;
};

// ✅ Get asset by ID
export const getAssetById = async (id) => {
  const res = await api.get(`${ASSET_API}/${id}`);
  return res.data;
};

// ✅ Create asset
export const createAsset = async (asset) => {
  const res = await api.post(ASSET_API, asset);
  return res.data;
};

// ✅ Update asset
export const updateAsset = async (id, data) => {
  const res = await api.put(`${ASSET_API}/${id}`, data);
  return res.data;
};

// ✅ Delete asset
export const deleteAsset = async (id) => {
  const res = await api.delete(`${ASSET_API}/${id}`);
  return res.data;
};
