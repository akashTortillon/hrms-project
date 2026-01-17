import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import {
    getSettings,
    updateGlobalSettings,
    addHoliday,
    updateHoliday,
    deleteHoliday,
    toggleNotification as toggleNotificationApi
} from "../../../services/systemSettingsService";

export default function useSystemSettings() {
    const [loading, setLoading] = useState(false);
    const [holidays, setHolidays] = useState([]);

    // Default structure to avoid undefined errors before fetch
    const [notificationSettings, setNotificationSettings] = useState([]);

    /* --- Modal & Action State --- */
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState("");
    const [inputValue, setInputValue] = useState("");
    const [editId, setEditId] = useState(null);
    const [holidayDate, setHolidayDate] = useState("");

    const [deleteConfig, setDeleteConfig] = useState({
        show: false,
        type: null,
        id: null,
        name: null
    });

    // Settings State
    const [settings, setSettings] = useState({
        currency: "AED",
        dateFormat: "DD/MM/YYYY",
        timezone: "Asia/Dubai",
        fiscalYearStart: "January"
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await getSettings();
            if (data) {
                setSettings({
                    currency: data.currency,
                    dateFormat: data.dateFormat,
                    timezone: data.timezone,
                    fiscalYearStart: data.fiscalYearStart
                });
                setHolidays(data.holidays || []);
                setNotificationSettings(data.notifications || []);
            }
        } catch (error) {
            console.error("Failed to fetch settings", error);
            toast.error("Failed to load system settings");
        } finally {
            setLoading(false);
        }
    };

    // Auto-save global settings changes
    const handleSettingsChange = async (field, value) => {
        setSettings(prev => ({ ...prev, [field]: value }));
        try {
            await updateGlobalSettings({ [field]: value });
        } catch (error) {
            console.error(error);
            toast.error("Failed to update setting");
        }
    };

    const toggleNotification = async (id) => {
        setNotificationSettings((prev) =>
            prev.map((n) => (n.id === id ? { ...n, enabled: !n.enabled } : n))
        );
        try {
            await toggleNotificationApi(id);
        } catch (error) {
            console.error(error);
            toast.error("Failed to update notification");
        }
    };

    /* --- Modal Handlers --- */
    const handleOpenAdd = (type) => {
        setModalType(type);
        setInputValue("");
        setHolidayDate("");
        setEditId(null);
        setShowModal(true);
    };

    const handleOpenEdit = (type, item) => {
        setModalType(type);
        setInputValue(item.name);
        if (type === "Holiday" && item.date) {
            // Extract YYYY-MM-DD from date string
            const d = new Date(item.date);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            setHolidayDate(`${yyyy}-${mm}-${dd}`);
        } else {
            setHolidayDate("");
        }
        setEditId(item._id);
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!inputValue.trim()) return toast.warning("Please enter a name");
        setLoading(true);

        try {
            // HOLIDAYS
            if (modalType === "Holiday") {
                const payload = {
                    name: inputValue,
                    date: holidayDate
                };

                let data;
                if (editId) {
                    data = await updateHoliday(editId, payload);
                    toast.success("Holiday updated");
                } else {
                    data = await addHoliday(payload);
                    toast.success("Holiday added");
                }
                setHolidays(data.holidays);
            }
            setShowModal(false);
        } catch (error) {
            console.error(error);
            toast.error(`Failed to ${editId ? "update" : "add"} ${modalType}`);
        } finally {
            setLoading(false);
            setEditId(null);
        }
    };

    /* --- Delete Handlers --- */
    const handleDelete = (type, id) => {
        let item = null;
        if (type === "Holiday") item = holidays.find(h => h._id === id);

        setDeleteConfig({
            show: true,
            type,
            id,
            name: item ? item.name : "this item"
        });
    };

    const confirmDelete = async () => {
        const { type, id } = deleteConfig;
        if (!type || !id) return;

        setLoading(true);
        try {
            if (type === "Holiday") {
                const data = await deleteHoliday(id);
                setHolidays(data.holidays);
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

    // Data Management Mock Handlers
    const handleImport = () => toast.info("Import functionality coming soon");
    const handleBackup = () => toast.info("Backup functionality coming soon");
    const handleRestore = () => toast.info("Restore functionality coming soon");

    return {
        loading,
        holidays,
        notificationSettings,
        settings,
        handleSettingsChange,
        toggleNotification,

        // Modal State & Handlers
        showModal,
        setShowModal,
        modalType,
        inputValue,
        setInputValue,
        holidayDate,
        setHolidayDate,
        handleOpenAdd,
        handleOpenEdit,
        handleSave,

        // Delete State & Handlers
        handleDelete,
        confirmDelete,
        deleteConfig,
        setDeleteConfig,

        handleImport,
        handleBackup,
        handleRestore
    };
}
