import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import {
    getDepartments,
    addDepartment,
    deleteDepartment,
    getBranches,
    addBranch,
    deleteBranch,
    getDesignations,
    addDesignation,
    deleteDesignation
} from "../../../services/masterService.js";

export default function useCompanyStructure() {
    const [departments, setDepartments] = useState([]);
    const [branches, setBranches] = useState([]);
    const [designations, setDesignations] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState("");
    const [inputValue, setInputValue] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const data = await getDepartments();
            console.log("✅ Departments fetched:", data);
            setDepartments(data);
        } catch (error) {
            console.error("❌ Error fetching departments:", error);
            toast.error("Failed to load departments");
        }

        try {
            const data = await getBranches();
            console.log("✅ Branches fetched:", data);
            setBranches(data);
        } catch (error) {
            console.error("❌ Error fetching branches:", error);
        }

        try {
            const data = await getDesignations();
            console.log("✅ Designations fetched:", data);
            setDesignations(data);
        } catch (error) {
            console.error("❌ Error fetching designations:", error);
        }
    };

    const handleOpenAdd = (type) => {
        console.log(type)
        setModalType(type);
        setInputValue("");
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!inputValue.trim()) return toast.warning("Please enter a name");
        setLoading(true);
        try {
            if (modalType === "Department") {
                await addDepartment(inputValue);
                const data = await getDepartments();
                setDepartments(data);
            } else if (modalType === "Branch") {
                await addBranch(inputValue);
                const data = await getBranches();
                setBranches(data);
            } else if (modalType === "Designation") {
                await addDesignation(inputValue);
                const data = await getDesignations();
                setDesignations(data);
            }
            toast.success(`${modalType} added successfully!`);
            setShowModal(false);
        } catch (error) {
            console.error(error);
            toast.error(`Failed to add ${modalType}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (type, id) => {
        if (!window.confirm(`Are you sure you want to delete this ${type}?`)) return;
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
            }
            toast.success(`${type} deleted successfully`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete item");
        }
    };

    return {
        departments,
        branches,
        designations,
        showModal,
        setShowModal,
        modalType,
        inputValue,
        setInputValue,
        loading,
        handleOpenAdd,
        handleSave,
        handleDelete,
    };
}
