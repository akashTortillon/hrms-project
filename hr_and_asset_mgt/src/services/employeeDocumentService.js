import api from "../api/apiClient";

const BASE_URL = "/api/employee-docs";

// Get logged-in user's documents
export const getMyDocuments = async (employeeId) => {
    // We now use the dedicated endpoint which relies on the backend token
    // employeeId param is ignored/deprecated but kept for signature compatibility if needed
    const response = await api.get(`${BASE_URL}/my/all`);
    return response.data;
};

// Upload Employee Document (might be used if employees can upload self docs later)
export const uploadEmployeeDocument = async (formData) => {
    // Note: formData must contain 'file', 'documentType', etc.
    const res = await api.post(BASE_URL, formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });
    return res.data;
};
