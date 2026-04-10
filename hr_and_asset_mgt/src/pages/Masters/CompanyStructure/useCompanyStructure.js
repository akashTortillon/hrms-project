import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import {
    getDepartments,
    addDepartment,
    updateDepartment,
    deleteDepartment,
    getCompanies,
    addCompany,
    updateCompany,
    deleteCompany,
    getBranches,
    addBranch,
    updateBranch,
    deleteBranch,
    getDesignations,
    addDesignation,
    updateDesignation,
    deleteDesignation,
    roleService,
    repaymentPeriodService
} from "../../../services/masterService.js";

export default function useCompanyStructure() {
    const [departments, setDepartments] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [branches, setBranches] = useState([]);
    const [designations, setDesignations] = useState([]);
    const [repaymentPeriods, setRepaymentPeriods] = useState([]);
    const [roles, setRoles] = useState([]);
    const [selectedPermissions, setSelectedPermissions] = useState([]);
    const [repaymentMonths, setRepaymentMonths] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState("");
    const [inputValue, setInputValue] = useState("");
    const [editId, setEditId] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [loading, setLoading] = useState(false);

    const [deleteConfig, setDeleteConfig] = useState({ show: false, type: null, id: null, name: null });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const data = await getDepartments();
            setDepartments(data);
        } catch (error) {
            console.error("❌ Error fetching departments:", error);
            toast.error("Failed to load departments");
        }

        try {
            const data = await getCompanies();
            setCompanies(data);
        } catch (error) {
            console.error("❌ Error fetching companies:", error);
        }

        try {
            const data = await getBranches();
            setBranches(data);
        } catch (error) {
            console.error("❌ Error fetching branches:", error);
        }

        try {
            const data = await getDesignations();
            setDesignations(data);
        } catch (error) {
            console.error("❌ Error fetching designations:", error);
        }

        try {
            const data = await roleService.getAll();
            setRoles(data);
        } catch (error) {
            console.error("❌ Error fetching roles:", error);
        }

        try {
            const data = await repaymentPeriodService.getAll();
            setRepaymentPeriods(data);
        } catch (error) {
            console.error("❌ Error fetching repayment periods:", error);
        }
    };

    const handleOpenAdd = (type) => {
        setModalType(type);
        setInputValue("");
        setSelectedPermissions([]);
        setRepaymentMonths("");
        setEditId(null);
        setImageFile(null);
        setImagePreview(null);
        setShowModal(true);
    };

    const handleOpenEdit = (type, item) => {
        setModalType(type);
        setInputValue(item.name);
        if (type === "Role") {
            setSelectedPermissions(item.permissions || []);
        }
        if (type === "Repayment Period") {
            setRepaymentMonths(String(item.metadata?.months || parseInt(item.name, 10) || ""));
        }
        if (type === "Company") {
            setImagePreview(item.image);
            setImageFile(null);
        }
        setEditId(item._id);
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!inputValue.trim()) return toast.warning("Please enter a name");
        setLoading(true);
        try {
            if (modalType === "Department") {
                const payload = { name: inputValue };
                if (editId) await updateDepartment(editId, payload);
                else await addDepartment(payload);
                const data = await getDepartments();
                setDepartments(data);
            } else if (modalType === "Company") {
                const formData = new FormData();
                formData.append("name", inputValue);
                if (imageFile) {
                    formData.append("image", imageFile);
                }
                
                if (editId) await updateCompany(editId, formData);
                else await addCompany(formData);
                const data = await getCompanies();
                setCompanies(data);
            } else if (modalType === "Branch") {
                const payload = { name: inputValue };
                if (editId) await updateBranch(editId, payload);
                else await addBranch(payload);
                const data = await getBranches();
                setBranches(data);
            } else if (modalType === "Designation") {
                const payload = { name: inputValue };
                if (editId) await updateDesignation(editId, payload);
                else await addDesignation(payload);
                const data = await getDesignations();
                setDesignations(data);
            } else if (modalType === "Role") {
                const payload = {
                    name: inputValue,
                    permissions: selectedPermissions
                };
                if (editId) await roleService.update(editId, payload);
                else await roleService.add(payload);
                const data = await roleService.getAll();
                setRoles(data);
            } else if (modalType === "Repayment Period") {
                const months = Number(repaymentMonths);
                if (!Number.isFinite(months) || months <= 0) {
                    toast.warning("Please enter a valid repayment month count");
                    return;
                }
                const payload = {
                    name: inputValue,
                    metadata: { months }
                };
                if (editId) await repaymentPeriodService.update(editId, payload);
                else await repaymentPeriodService.add(payload);
                const data = await repaymentPeriodService.getAll();
                setRepaymentPeriods(data);
            }
            toast.success(`${modalType} ${editId ? "updated" : "added"} successfully!`);
            setShowModal(false);
        } catch (error) {
            console.error(error);
            toast.error(`Failed to ${editId ? "update" : "add"} ${modalType}`);
        } finally {
            setLoading(false);
            setEditId(null);
            setImageFile(null);
            setImagePreview(null);
        }
    };

    const handleDelete = (type, id) => {
        let item = null;
        if (type === "Department") item = departments.find(i => i._id === id);
        else if (type === "Company") item = companies.find(i => i._id === id);
        else if (type === "Branch") item = branches.find(i => i._id === id);
        else if (type === "Designation") item = designations.find(i => i._id === id);
        else if (type === "Role") item = roles.find(i => i._id === id);
        else if (type === "Repayment Period") item = repaymentPeriods.find(i => i._id === id);

        setDeleteConfig({ show: true, type, id, name: item ? item.name : "this item" });
    };

    const confirmDelete = async () => {
        const { type, id } = deleteConfig;
        if (!type || !id) return;

        setLoading(true);
        try {
            if (type === "Department") {
                await deleteDepartment(id);
                setDepartments(departments.filter((d) => d._id !== id));
            } else if (type === "Company") {
                await deleteCompany(id);
                setCompanies(companies.filter((c) => c._id !== id));
            } else if (type === "Branch") {
                await deleteBranch(id);
                setBranches(branches.filter((b) => b._id !== id));
            } else if (type === "Designation") {
                await deleteDesignation(id);
                setDesignations(designations.filter((d) => d._id !== id));
            } else if (type === "Role") {
                await roleService.delete(id);
                setRoles(roles.filter((r) => r._id !== id));
            } else if (type === "Repayment Period") {
                await repaymentPeriodService.delete(id);
                setRepaymentPeriods(repaymentPeriods.filter((period) => period._id !== id));
            }
            toast.success(`${type} deleted successfully`);
            setDeleteConfig({ ...deleteConfig, show: false });
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete item");
        } finally {
            setLoading(false);
        }
    };

    return {
        departments,
        companies,
        branches,
        designations,
        repaymentPeriods,
        roles,
        selectedPermissions,
        setSelectedPermissions,
        repaymentMonths,
        setRepaymentMonths,
        showModal,
        setShowModal,
        modalType,
        inputValue,
        setInputValue,
        loading,
        imageFile,
        setImageFile,
        imagePreview,
        setImagePreview,
        handleOpenAdd,
        handleOpenEdit,
        handleSave,
        handleDelete,
        confirmDelete,
        deleteConfig,
        setDeleteConfig
    };
}
