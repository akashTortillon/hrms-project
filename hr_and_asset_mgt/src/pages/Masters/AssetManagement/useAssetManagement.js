import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import {
    assetTypeService,
    assetCategoryService,
    assetStatusService,
    vendorService,
    serviceTypeService
} from "../../../services/masterService";

export default function useAssetManagement() {
    const [assetTypes, setAssetTypes] = useState([]);
    const [assetCategories, setAssetCategories] = useState([]);
    const [assetStatuses, setAssetStatuses] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [serviceTypes, setServiceTypes] = useState([]);

    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState("");
    const [inputValue, setInputValue] = useState("");
    const [inputDesc, setInputDesc] = useState(""); // Description state
    const [editId, setEditId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [deleteConfig, setDeleteConfig] = useState({ show: false, type: null, id: null, name: null });

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        try { setAssetTypes(await assetTypeService.getAll()); } catch (e) { console.error(e); }
        try { setAssetCategories(await assetCategoryService.getAll()); } catch (e) { console.error(e); }
        try { setAssetStatuses(await assetStatusService.getAll()); } catch (e) { console.error(e); }
        try { setVendors(await vendorService.getAll()); } catch (e) { console.error(e); }
        try { setServiceTypes(await serviceTypeService.getAll()); } catch (e) { console.error(e); }
    };

    const handleOpenAdd = (type) => {
        setModalType(type);
        setInputValue("");
        setInputDesc("");
        setEditId(null);
        setShowModal(true);
    };

    const handleOpenEdit = (type, item) => {
        setModalType(type);
        setInputValue(item.name);
        setInputDesc(item.description || "");
        setEditId(item._id);
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!inputValue.trim()) return toast.warning("Please enter a name");
        setLoading(true);

        const payload = { name: inputValue, description: inputDesc };

        try {
            if (modalType === "Asset Type") {
                if (editId) await assetTypeService.update(editId, inputValue);
                else await assetTypeService.add(inputValue);
                setAssetTypes(await assetTypeService.getAll());
            } else if (modalType === "Asset Category") {
                if (editId) await assetCategoryService.update(editId, inputValue);
                else await assetCategoryService.add(inputValue);
                setAssetCategories(await assetCategoryService.getAll());
            } else if (modalType === "Status Label") {
                if (editId) await assetStatusService.update(editId, inputValue);
                else await assetStatusService.add(inputValue);
                setAssetStatuses(await assetStatusService.getAll());
            } else if (modalType === "Vendor") {
                if (editId) await vendorService.update(editId, payload);
                else await vendorService.add(payload);
                setVendors(await vendorService.getAll());
            } else if (modalType === "Service Type") {
                // Service Type currently just name, but we can pass payload if desc needed
                if (editId) await serviceTypeService.update(editId, inputValue);
                else await serviceTypeService.add(inputValue);
                setServiceTypes(await serviceTypeService.getAll());
            }
            toast.success(`${modalType} ${editId ? "updated" : "added"} successfully`);
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
        if (type === "Asset Type") item = assetTypes.find(i => i._id === id);
        else if (type === "Asset Category") item = assetCategories.find(i => i._id === id);
        else if (type === "Status Label") item = assetStatuses.find(i => i._id === id);
        else if (type === "Vendor") item = vendors.find(i => i._id === id);
        else if (type === "Service Type") item = serviceTypes.find(i => i._id === id);

        setDeleteConfig({ show: true, type, id, name: item ? item.name : "this item" });
    };

    const confirmDelete = async () => {
        const { type, id } = deleteConfig;
        if (!type || !id) return;

        setLoading(true);
        try {
            if (type === "Asset Type") {
                await assetTypeService.delete(id);
                setAssetTypes(assetTypes.filter(i => i._id !== id));
            } else if (type === "Asset Category") {
                await assetCategoryService.delete(id);
                setAssetCategories(assetCategories.filter(i => i._id !== id));
            } else if (type === "Status Label") {
                await assetStatusService.delete(id);
                setAssetStatuses(assetStatuses.filter(i => i._id !== id));
            } else if (type === "Vendor") {
                await vendorService.delete(id);
                setVendors(vendors.filter(i => i._id !== id));
            } else if (type === "Service Type") {
                await serviceTypeService.delete(id);
                setServiceTypes(serviceTypes.filter(i => i._id !== id));
            }
            toast.success("Deleted successfully");
            setDeleteConfig({ ...deleteConfig, show: false });
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete");
        } finally {
            setLoading(false);
        }
    };

    return {
        assetTypes,
        assetCategories,
        assetStatuses,
        vendors,
        serviceTypes,
        showModal,
        setShowModal,
        modalType,
        inputValue,
        setInputValue,
        inputDesc,
        setInputDesc,
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
