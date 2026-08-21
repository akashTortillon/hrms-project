import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import {
    getSettings,
    updateGlobalSettings,
    addHoliday,
    updateHoliday,
    deleteHoliday,
    addAllowanceType,
    updateAllowanceType,
    deleteAllowanceType,
    toggleNotification as toggleNotificationApi,
    downloadBackup as downloadBackupApi
} from "../../../services/systemSettingsService";
import { payrollService } from "../../../services/payrollService";

export default function useSystemSettings() {
    const [loading, setLoading] = useState(false);
    const [holidays, setHolidays] = useState([]);
    const [allowanceTypes, setAllowanceTypes] = useState([]);

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

    /* --- Payroll Period Anchor --- */
    const [currentAnchorEnd, setCurrentAnchorEnd] = useState(null); // "YYYY-MM-DD" | null
    const [showAnchorModal, setShowAnchorModal] = useState(false);
    const [anchorDateInput, setAnchorDateInput] = useState("");
    const [anchorConfirmText, setAnchorConfirmText] = useState("");
    const [anchorConflict, setAnchorConflict] = useState(null); // { message } | null
    const [anchorSaving, setAnchorSaving] = useState(false);

    useEffect(() => {
        fetchData();
        fetchCurrentAnchor();
    }, []);

    const fetchCurrentAnchor = async () => {
        try {
            const latest = await payrollService.getLatestFinalizedPeriod();
            setCurrentAnchorEnd(latest?.periodEndStr || null);
        } catch (error) {
            console.error("Failed to fetch payroll anchor", error);
        }
    };

    const openAnchorModal = () => {
        setAnchorDateInput("");
        setAnchorConfirmText("");
        setAnchorConflict(null);
        setShowAnchorModal(true);
    };

    const closeAnchorModal = () => {
        setShowAnchorModal(false);
        setAnchorDateInput("");
        setAnchorConfirmText("");
        setAnchorConflict(null);
    };

    const handleSetAnchor = async (force = false) => {
        if (!anchorDateInput) return toast.warning("Pick a date first");

        setAnchorSaving(true);
        try {
            const result = await payrollService.setAnchor(anchorDateInput, force);
            toast.success(result.message);
            setCurrentAnchorEnd(result.anchorPeriodEnd);
            closeAnchorModal();
        } catch (error) {
            const status = error.response?.status;
            const message = error.response?.data?.message || "Failed to set payroll anchor";
            if (status === 409) {
                // Conflict with an already-finalized period — surface it and let the
                // user explicitly override instead of silently retrying with force.
                setAnchorConflict({ message });
            } else {
                toast.error(message);
            }
        } finally {
            setAnchorSaving(false);
        }
    };

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
                setAllowanceTypes(data.allowanceTypes || []);
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

            // ALLOWANCE TYPES
            if (modalType === "Allowance Type") {
                const payload = { name: inputValue };

                let data;
                if (editId) {
                    data = await updateAllowanceType(editId, payload);
                    toast.success("Allowance type updated");
                } else {
                    data = await addAllowanceType(payload);
                    toast.success("Allowance type added");
                }
                setAllowanceTypes(data.allowanceTypes);
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
        if (type === "Allowance Type") item = allowanceTypes.find(a => a._id === id);

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
            if (type === "Allowance Type") {
                const data = await deleteAllowanceType(id);
                setAllowanceTypes(data.allowanceTypes);
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

    // Data Management Handlers
    const handleImport = () => toast.info("Import functionality coming soon");
    const handleBackup = async () => {
        try {
            const blob = await downloadBackupApi();
            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `hrms_backup_${new Date().toISOString().slice(0, 10)}.zip`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success("Backup downloaded successfully");
        } catch (error) {
            console.error("Backup failed", error);
            toast.error(error.response?.data?.message || "Backup failed");
        }
    };
    const handleRestore = () => toast.info("Restore functionality coming soon");

    return {
        loading,
        holidays,
        allowanceTypes,
        notificationSettings,
        settings,
        handleSettingsChange,
        toggleNotification,

        // Payroll Period Anchor
        currentAnchorEnd,
        showAnchorModal,
        openAnchorModal,
        closeAnchorModal,
        anchorDateInput,
        setAnchorDateInput,
        anchorConfirmText,
        setAnchorConfirmText,
        anchorConflict,
        anchorSaving,
        handleSetAnchor,

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
