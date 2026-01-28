import SystemSettings from '../models/systemSettingsModel.js';

// Default Notifications to seed if new
const DEFAULT_NOTIFICATIONS = [
    {
        id: "doc_expiry",
        title: "Document Expiry Alerts",
        desc: "Send notifications for expiring documents",
        enabled: true,
    },
    {
        id: "leave_req",
        title: "Leave Request Notifications",
        desc: "Notify approvers of new requests",
        enabled: true,
    },
    {
        id: "asset_maint",
        title: "Asset Maintenance Reminders",
        desc: "Alert for upcoming maintenance",
        enabled: false,
    },
];

// Helper to get or create settings
const getSettingsDoc = async () => {
    let settings = await SystemSettings.findOne();
    if (!settings) {
        settings = await SystemSettings.create({
            holidays: [
                { name: "New Year" },
                { name: "Eid Al Fitr" },
                { name: "Eid Al Adha" },
                { name: "National Day" },
                { name: "Commemoration Day" },
            ],
            notifications: DEFAULT_NOTIFICATIONS
        });
    } else {
        // Ensure arrays exist and are valid
        if (!settings.holidays) settings.holidays = [];

        // Fix: Check for corrupted notifications (e.g. missing required fields) which cause validation errors on save
        const isNotificationsInvalid = !settings.notifications ||
            settings.notifications.length === 0 ||
            settings.notifications.some(n => !n.id || !n.title);

        if (isNotificationsInvalid) {
            // Seed defaults if missing or corrupted
            settings.notifications = DEFAULT_NOTIFICATIONS;
            // We must save here to persist the fix immediately, otherwise subsequent operations might fail
            await settings.save();
        }
    }
    return settings;
};

export const getSettings = async (req, res) => {
    try {
        const settings = await getSettingsDoc();
        res.status(200).json(settings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateGlobalSettings = async (req, res) => {
    try {
        const settings = await getSettingsDoc();
        const { currency, dateFormat, timezone, fiscalYearStart } = req.body;

        if (currency) settings.currency = currency;
        if (dateFormat) settings.dateFormat = dateFormat;
        if (timezone) settings.timezone = timezone;
        if (fiscalYearStart) settings.fiscalYearStart = fiscalYearStart;

        await settings.save();
        res.status(200).json(settings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Holidays
export const addHoliday = async (req, res) => {
    try {

        const { name, date } = req.body;
        if (!name) {
            // console.error("Add Holiday Error: Name is missing");
            return res.status(400).json({ message: "Name is required" });
        }

        const settings = await getSettingsDoc();
        settings.holidays.push({ name, date });
        await settings.save();
        res.status(200).json(settings);
    } catch (error) {
        // console.error("Add Holiday Error:", error);
        res.status(500).json({ message: error.message });
    }
};

export const updateHoliday = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, date } = req.body;
        const settings = await getSettingsDoc();

        const holiday = settings.holidays.id(id);
        if (holiday) {
            holiday.name = name;
            if (date) holiday.date = date;
            await settings.save();
        }
        res.status(200).json(settings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteHoliday = async (req, res) => {
    try {
        const { id } = req.params;
        const settings = await getSettingsDoc();
        settings.holidays.pull(id);
        await settings.save();
        res.status(200).json(settings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Notifications
export const toggleNotification = async (req, res) => {
    try {
        const { id } = req.params; // string id
        const settings = await getSettingsDoc();

        const idx = settings.notifications.findIndex(n => n.id === id);
        if (idx !== -1) {
            settings.notifications[idx].enabled = !settings.notifications[idx].enabled;
            await settings.save();
        }
        res.status(200).json(settings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
