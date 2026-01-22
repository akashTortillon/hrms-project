import api from "./getAxiosInstance";

const BASE_URL = "/api/documents";

// Get all documents (supports query params: { search, type, status })
export const getDocuments = async (params = {}) => {
    const response = await api.get(BASE_URL, { params });
    return response.data;
};

// UPLOAD doc
export const uploadDocument = async (formData) => {
    // Note: formData must contain 'file', 'name', 'type', 'expiryDate'
    const res = await api.post(BASE_URL, formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });
    return res.data;
};

// GET Stats
export const getDocumentStats = async () => {
    const res = await api.get(`${BASE_URL}/stats`);
    return res.data;
};

// DELETE doc
export const deleteDocument = async (id) => {
    const res = await api.delete(`${BASE_URL}/${id}`);
    return res.data;
};


