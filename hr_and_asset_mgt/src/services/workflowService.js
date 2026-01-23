import api from "../api/apiClient";

const BASE_URL = "/api/workflows";

// Get Workflow (Lazy Init)
export const getEmployeeWorkflow = async (employeeId, type) => {
    const res = await api.get(`${BASE_URL}/${employeeId}/${type}`);
    return res.data;
};

// Update Item (Status or File)
export const updateWorkflowItem = async (workflowId, itemId, formData) => {
    // FormData expected if file upload, or JSON if just status?
    // Controller handles logic. If formData has 'file', it uploads.
    // If just status update, JSON is fine? 
    // BUT our apiClient sets 'Content-Type': 'application/json' by default.
    // We need to override headers for FormData.

    const isFormData = formData instanceof FormData;

    const config = isFormData ? {
        headers: { "Content-Type": "multipart/form-data" }
    } : {};

    const res = await api.put(`${BASE_URL}/${workflowId}/${itemId}`, formData, config);
    return res.data;
};

// Add Custom Item
export const addItemToWorkflow = async (workflowId, name) => {
    const res = await api.post(`${BASE_URL}/${workflowId}/items`, { name });
    return res.data;
};
