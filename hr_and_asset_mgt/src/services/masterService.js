import axios from "axios";

// Create axios instance
const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE,
    headers: {
        "Content-Type": "application/json",
    },
});

// Interceptor for token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");

    // DEBUG LOGGING
    console.log(`[API Request] URL: ${config.baseURL}${config.url}`, config);

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

const BASE_URL = "/api/masters";

// --- DEPARTMENTS ---
export const getDepartments = async () => {
    const res = await api.get(`${BASE_URL}/departments`);
    return res.data;
};

export const addDepartment = async (name) => {
    const res = await api.post(`${BASE_URL}/departments`, { name });
    console.log(res)
    return res.data;
};

export const deleteDepartment = async (id) => {
    const res = await api.delete(`${BASE_URL}/departments/${id}`);
    return res.data;
};

// --- BRANCHES ---
export const getBranches = async () => {
    const res = await api.get(`${BASE_URL}/branches`);
    return res.data;
};

export const addBranch = async (name) => {
    const res = await api.post(`${BASE_URL}/branches`, { name });
    return res.data;
};

export const deleteBranch = async (id) => {
    const res = await api.delete(`${BASE_URL}/branches/${id}`);
    return res.data;
};

// --- DESIGNATIONS ---
export const getDesignations = async () => {
    const res = await api.get(`${BASE_URL}/designations`);
    return res.data;
};

export const addDesignation = async (name) => {
    const res = await api.post(`${BASE_URL}/designations`, { name });
    return res.data;
};

export const deleteDesignation = async (id) => {
    const res = await api.delete(`${BASE_URL}/designations/${id}`);
    return res.data;
};

// --- HR MASTERS (Employee Types, Leave Types, etc) ---
const HR_BASE_URL = '/api/masters/hr';

// Helper for generic HR Master calls
const createMasterService = (endpoint) => ({
    getAll: async () => {
        const res = await api.get(`${HR_BASE_URL}/${endpoint}`);
        return res.data;
    },
    add: async (name) => {
        const res = await api.post(`${HR_BASE_URL}/${endpoint}`, { name });
        return res.data;
    },
    delete: async (id) => {
        const res = await api.delete(`${HR_BASE_URL}/${endpoint}/${id}`);
        return res.data;
    }
});

export const employeeTypeService = createMasterService('employee-types');
export const leaveTypeService = createMasterService('leave-types');
export const documentTypeService = createMasterService('document-types');
export const nationalityService = createMasterService('nationalities');
