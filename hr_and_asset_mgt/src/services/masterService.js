import api from "./getAxiosInstance";

// --- UNIFIED MASTERS ---
// All masters use the same endpoint structure: /api/masters/:type

const UNIFIED_BASE = "/api/masters";

const createGenericService = (typeSlug) => ({
    getAll: async () => {
        const res = await api.get(`${UNIFIED_BASE}/${typeSlug}`);
        return res.data;
    },
    add: async (data) => {
        // Handle both simple name string and complex object
        const payload = typeof data === 'string' ? { name: data } : data;
        const res = await api.post(`${UNIFIED_BASE}/${typeSlug}`, payload);
        return res.data;
    },
    update: async (id, data) => {
        const payload = typeof data === 'string' ? { name: data } : data;
        const res = await api.put(`${UNIFIED_BASE}/${typeSlug}/${id}`, payload);
        return res.data;
    },
    delete: async (id) => {
        const res = await api.delete(`${UNIFIED_BASE}/${typeSlug}/${id}`);
        return res.data;
    }
});

// Explicit exports for backward compatibility with consuming components
export const getDepartments = async () => (await createGenericService("departments").getAll());
export const addDepartment = async (name) => (await createGenericService("departments").add(name));
export const updateDepartment = async (id, name) => (await createGenericService("departments").update(id, name));
export const deleteDepartment = async (id) => (await createGenericService("departments").delete(id));

export const getBranches = async () => (await createGenericService("branches").getAll());
export const addBranch = async (name) => (await createGenericService("branches").add(name));
export const updateBranch = async (id, name) => (await createGenericService("branches").update(id, name));
export const deleteBranch = async (id) => (await createGenericService("branches").delete(id));

export const getDesignations = async () => (await createGenericService("designations").getAll());
export const addDesignation = async (name) => (await createGenericService("designations").add(name));
export const updateDesignation = async (id, name) => (await createGenericService("designations").update(id, name));
export const deleteDesignation = async (id) => (await createGenericService("designations").delete(id));

// HR Masters
export const employeeTypeService = createGenericService('employee-types');
export const leaveTypeService = createGenericService('leave-types');
export const documentTypeService = createGenericService('document-types');
export const nationalityService = createGenericService('nationalities');
export const payrollRuleService = createGenericService('payroll-rules');
export const workflowTemplateService = createGenericService('workflow-templates');
export const shiftService = createGenericService('shifts');


// Asset Masters
export const assetTypeService = createGenericService('asset-types');
export const assetCategoryService = createGenericService('asset-categories');
export const assetStatusService = createGenericService('status-labels');
export const vendorService = createGenericService('vendors');
export const serviceTypeService = createGenericService('service-types');
export const roleService = createGenericService('roles');

export const companyDocumentTypeService = createGenericService('company-document-types');
export const maintenanceShopService = createGenericService('maintenance-shops');
