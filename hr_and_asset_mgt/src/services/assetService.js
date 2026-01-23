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
//   if (token) {
//     config.headers.Authorization = `Bearer ${token}`;
//   }
//   return config;
// });

// const ASSET_API = "/api/assets";

// // ✅ Fetch all assets
// export const getAssets = async () => {
//   const res = await api.get(ASSET_API);
//   return res.data;
// };

// // ✅ Get asset by ID
// export const getAssetById = async (id) => {
//   const res = await api.get(`${ASSET_API}/${id}`);
//   return res.data;
// };

// // ✅ Create asset
// export const createAsset = async (asset) => {
//   const res = await api.post(ASSET_API, asset);
//   return res.data;
// };

// // ✅ Update asset
// export const updateAsset = async (id, data) => {
//   const res = await api.put(`${ASSET_API}/${id}`, data);
//   return res.data;
// };

// // ✅ Delete asset
// export const deleteAsset = async (id) => {
//   const res = await api.delete(`${ASSET_API}/${id}`);
//   return res.data;
// };









// import axios from "axios";

// // axios instance
// const api = axios.create({
//   baseURL: import.meta.env.VITE_API_BASE,
//   headers: {
//     "Content-Type": "application/json",
//   },
// });

import api from "../api/apiClient";






const ASSET_API = "/api/assets";

// ==================== ASSET CRUD ====================

// Fetch all assets
export const getAssets = async (params = {}) => {
  const res = await api.get(ASSET_API, {
    params, // { search, type, status }
  });
  return res.data;
};

// Get asset by ID
export const getAssetById = async (id) => {
  const res = await api.get(`${ASSET_API}/${id}`);
  return res.data;
};

// Create asset
export const createAsset = async (asset) => {
  const res = await api.post(ASSET_API, asset);
  return res.data;
};

// Update asset
export const updateAsset = async (id, data) => {
  const res = await api.put(`${ASSET_API}/${id}`, data);
  return res.data;
};

// Delete asset
export const deleteAsset = async (id) => {
  const res = await api.delete(`${ASSET_API}/${id}`);
  return res.data;
};

// ==================== MAINTENANCE ====================

// Schedule maintenance
export const scheduleMaintenance = async (assetId, data) => {
  const res = await api.post(`${ASSET_API}/${assetId}/maintenance`, data);
  return res.data;
};

// Update maintenance log
export const updateMaintenanceLog = async (assetId, maintenanceId, data) => {
  const res = await api.put(`${ASSET_API}/${assetId}/maintenance/${maintenanceId}`, data);
  return res.data;
};

// Delete maintenance log
export const deleteMaintenanceLog = async (assetId, maintenanceId) => {
  const res = await api.delete(`${ASSET_API}/${assetId}/maintenance/${maintenanceId}`);
  return res.data;
};

// ==================== AMC ====================

// Update AMC details
export const updateAmcDetails = async (assetId, data) => {
  const res = await api.put(`${ASSET_API}/${assetId}/amc`, data);
  return res.data;
};

// ==================== DOCUMENTS ====================

// Upload document
export const uploadDocument = async (assetId, formData) => {
  const res = await api.post(`${ASSET_API}/${assetId}/documents`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
};

// Delete document
export const deleteDocument = async (assetId, documentId) => {
  const res = await api.delete(`${ASSET_API}/${assetId}/documents/${documentId}`);
  return res.data;
};

// Download document
export const downloadDocument = async (assetId, documentId) => {
  const res = await api.get(`${ASSET_API}/${assetId}/documents/${documentId}/download`, {
    responseType: 'blob'
  });
  return res.data;
};

// ==================== DISPOSAL ====================

// Dispose asset
export const disposeAsset = async (assetId, data) => {
  const res = await api.post(`${ASSET_API}/${assetId}/dispose`, data);
  return res.data;
};

// ==================== ALERTS & REPORTS ====================

// Get asset alerts
export const getAssetAlerts = async () => {
  const res = await api.get(`${ASSET_API}/alerts/all`);
  return res.data;
};

// ==================== EMPLOYEE ASSETS ====================

// Get employee's assets
export const getEmployeeAssets = async (employeeId) => {
  const res = await api.get(`${ASSET_API}/employee/${employeeId}`);
  return res.data;
};


// EXPORT assets (Excel)
export const exportAssets = async (params = {}) => {
  const res = await api.get(`${ASSET_API}/export`, {
    params,
    responseType: 'blob'
  });
  return res.data;
};

// Bulk Import Assets
export const importAssets = async (assets) => {
  const res = await api.post(`${ASSET_API}/import`, { assets });
  return res.data;
};

//EMPLOYEE_API + "/export"