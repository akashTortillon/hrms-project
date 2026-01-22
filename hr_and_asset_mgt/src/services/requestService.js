



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

import api from "./getAxiosInstance"; 

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
  const response = await api.patch(
    `${REQUEST_API}/${requestId}/withdraw`
  );
  return response.data;
};

// Admin – get pending requests
export const getPendingRequests = async () => {
  const response = await api.get(
    `${REQUEST_API}/admin/pending`
  );
  return response.data;
};

// ✅ NEW: Document request services
export const approveDocumentRequest = async (requestId, formData) => {
  const response = await api.put(
    `${REQUEST_API}/${requestId}/approve-document`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
};

export const rejectDocumentRequest = async (requestId, rejectionReason) => {
  const response = await api.put(
    `${REQUEST_API}/${requestId}/reject-document`,
    { rejectionReason }
  );
  return response.data;
};

export const downloadDocument = async (requestId) => {
  const response = await api.get(
    `${REQUEST_API}/${requestId}/download`,
    {
      responseType: 'blob'
    }
  );
  return response.data;
};

// ✅ Admin – approve / reject request (FIXED)
export const updateRequestStatus = async (id, payload) => {
  const response = await api.put(
    `${REQUEST_API}/${id}/action`,
    payload
  );
  return response.data;
};
