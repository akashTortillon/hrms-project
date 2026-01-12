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

export const updateDepartment = async (id, name) => {
    const res = await api.put(`${BASE_URL}/departments/${id}`, { name });
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

export const updateBranch = async (id, name) => {
    const res = await api.put(`${BASE_URL}/branches/${id}`, { name });
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

export const updateDesignation = async (id, name) => {
    const res = await api.put(`${BASE_URL}/designations/${id}`, { name });
    return res.data;
};

export const deleteDesignation = async (id) => {
    const res = await api.delete(`${BASE_URL}/designations/${id}`);
    return res.data;
};

// --- HR MASTERS (Employee Types, Leave Types, etc) ---
const HR_BASE_URL = '/api/masters/hr';

// --- ASSET MASTERS ---
const ASSET_BASE_URL = '/api/masters/asset';

// We reuse createMasterService but need to ensure it uses the correct BASE_URL.
// Since createMasterService currently uses HR_BASE_URL hardcoded in the closure if not modified, 
// we should refactor createMasterService to accept baseUrl.

const createGenericService = (baseUrl, endpoint) => ({
    getAll: async () => {
        const res = await api.get(`${baseUrl}/${endpoint}`);
        return res.data;
    },
    add: async (data) => {
        // Handle both simple name string and complex object
        const payload = typeof data === 'string' ? { name: data } : data;
        const res = await api.post(`${baseUrl}/${endpoint}`, payload);
        return res.data;
    },
    update: async (id, data) => {
        // Handle both simple name string and complex object
        const payload = typeof data === 'string' ? { name: data } : data;
        const res = await api.put(`${baseUrl}/${endpoint}/${id}`, payload);
        return res.data;
    },
    delete: async (id) => {
        const res = await api.delete(`${baseUrl}/${endpoint}/${id}`);
        return res.data;
    }
});

export const employeeTypeService = createGenericService(HR_BASE_URL, 'employee-types');
export const leaveTypeService = createGenericService(HR_BASE_URL, 'leave-types');
export const documentTypeService = createGenericService(HR_BASE_URL, 'document-types');
export const nationalityService = createGenericService(HR_BASE_URL, 'nationalities');
export const payrollRuleService = createGenericService(HR_BASE_URL, 'payroll-rules');
export const workflowTemplateService = createGenericService(HR_BASE_URL, 'workflow-templates');

export const assetTypeService = createGenericService(ASSET_BASE_URL, 'asset-types');
export const assetCategoryService = createGenericService(ASSET_BASE_URL, 'asset-categories');
export const assetStatusService = createGenericService(ASSET_BASE_URL, 'status-labels');
export const vendorService = createGenericService(ASSET_BASE_URL, 'vendors');
export const serviceTypeService = createGenericService(ASSET_BASE_URL, 'service-types');
