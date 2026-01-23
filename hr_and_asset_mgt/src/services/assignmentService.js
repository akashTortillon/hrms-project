import api from "../api/apiClient";

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