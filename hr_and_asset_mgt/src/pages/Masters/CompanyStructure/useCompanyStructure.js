import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import {
    getDepartments,
    addDepartment,
    updateDepartment,
    deleteDepartment,
    getBranches,
    addBranch,
    updateBranch,
    deleteBranch,
    getDesignations,
    addDesignation,
    updateDesignation,
    deleteDesignation,
    roleService
} from "../../../services/masterService.js";

export default function useCompanyStructure() {
    const [departments, setDepartments] = useState([]);
    const [branches, setBranches] = useState([]);
    const [designations, setDesignations] = useState([]);
    const [roles, setRoles] = useState([]);
    const [selectedPermissions, setSelectedPermissions] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState("");
    const [inputValue, setInputValue] = useState("");
    const [editId, setEditId] = useState(null);
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
    };

    const handleOpenAdd = (type) => {
        setModalType(type);
        setInputValue("");
        setSelectedPermissions([]);
        setEditId(null);
        setShowModal(true);
    };

    const handleOpenEdit = (type, item) => {
        setModalType(type);
        setInputValue(item.name);
        if (type === "Role") {
            setSelectedPermissions(item.permissions || []);
        }
        setEditId(item._id);
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!inputValue.trim()) return toast.warning("Please enter a name");
        setLoading(true);
        try {
            if (modalType === "Department") {
                if (editId) await updateDepartment(editId, inputValue);
                else await addDepartment(inputValue);
                const data = await getDepartments();
                setDepartments(data);
            } else if (modalType === "Branch") {
                if (editId) await updateBranch(editId, inputValue);
                else await addBranch(inputValue);
                const data = await getBranches();
                setBranches(data);
            } else if (modalType === "Designation") {
                if (editId) await updateDesignation(editId, inputValue);
                else await addDesignation(inputValue);
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
            }
            toast.success(`${modalType} ${editId ? "updated" : "added"} successfully!`);
            setShowModal(false);
        } catch (error) {
            console.error(error);
            toast.error(`Failed to ${editId ? "update" : "add"} ${modalType}`);
        } finally {
            setLoading(false);
            setEditId(null);
        }
    };

    const handleDelete = (type, id) => {
        let item = null;
        if (type === "Department") item = departments.find(i => i._id === id);
        else if (type === "Branch") item = branches.find(i => i._id === id);
        else if (type === "Designation") item = designations.find(i => i._id === id);
        else if (type === "Role") item = roles.find(i => i._id === id);

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
            } else if (type === "Branch") {
                await deleteBranch(id);
                setBranches(branches.filter((b) => b._id !== id));
            } else if (type === "Designation") {
                await deleteDesignation(id);
                setDesignations(designations.filter((d) => d._id !== id));
            } else if (type === "Role") {
                await roleService.delete(id);
                setRoles(roles.filter((r) => r._id !== id));
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
        branches,
        designations,
        roles,
        selectedPermissions,
        setSelectedPermissions,
        showModal,
        setShowModal,
        modalType,
        inputValue,
        setInputValue,
        loading,
        handleOpenAdd,
        handleOpenEdit,
        handleSave,
        handleDelete,
        confirmDelete,
        deleteConfig,
        setDeleteConfig
    };
}
