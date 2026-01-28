import Notification from "../models/notificationModel.js";
import CompanyDocument from "../models/companyDocModel.js";
import Request from "../models/requestModel.js";
import Payroll from "../models/payrollModel.js";

/**
 * Get notifications for the logged-in user
 */
export const getNotifications = async (req, res) => {
    try {
        let notifications = await Notification.find({ recipient: req.user._id })
            .sort({ createdAt: -1 })
            .limit(30);

        // Convert to plain objects to allow insertion of virtual notifications
        notifications = notifications.map(n => n.toObject());

        // 🔹 DYNAMIC LOGIC FOR ADMINS / HR
        const isAdmin = ["Admin", "HR Admin", "HR Manager", "Super Admin"].includes(req.user.role);

        if (isAdmin) {
            const summaryNotifications = [];

            // 1. Expiring Documents Check
            const expiringDocsCount = await CompanyDocument.countDocuments({
                status: { $in: ["Expiring Soon", "Critical"] }
            });
            if (expiringDocsCount > 0) {
                summaryNotifications.push({
                    _id: "virtual-docs-expiry",
                    title: `${expiringDocsCount} Documents Expiring Soon`,
                    message: "Action required to renew global company documents.",
                    type: "EXPIRY",
                    link: "/app/documents",
                    isRead: false,
                    createdAt: new Date(),
                    isVirtual: true
                });
            }

            // 2. AGGREGATED Pending Requests (Sync with "PENDING" status)
            const pendingRequestsCount = await Request.countDocuments({ status: "PENDING" });
            if (pendingRequestsCount > 0) {
                summaryNotifications.push({
                    _id: "virtual-pending-requests",
                    title: `${pendingRequestsCount} Pending Requests`,
                    message: `${pendingRequestsCount} employee submissions awaiting review.`,
                    type: "REQUEST",
                    link: "/app/requests",
                    isRead: false,
                    createdAt: new Date(),
                    isVirtual: true
                });
            }

            // 3. Payroll Status Check
            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();
            const draftPayrollExists = await Payroll.exists({ month: currentMonth, year: currentYear, status: "DRAFT" });
            if (draftPayrollExists) {
                summaryNotifications.push({
                    _id: "virtual-payroll-due",
                    title: "Payroll Processing Due",
                    message: `Draft records exist for ${currentMonth}/${currentYear}.`,
                    type: "SYSTEM",
                    link: "/app/payroll",
                    isRead: false,
                    createdAt: new Date(),
                    isVirtual: true
                });
            }

            // Remove individual REQUEST notifications for Admin to avoid duplicate noise/double-counting
            const nonRequestDBNotifications = notifications.filter(n => n.type !== "REQUEST");

            return res.json([...summaryNotifications, ...nonRequestDBNotifications]);
        }

        // For Employees: Only show individual notifications if they are not system-level virtuals
        // (Virtuals are only for admin summaries here anyway)
        res.json(notifications);
    } catch (error) {
        console.error("Fetch Notifications Error:", error);
        res.status(500).json({ message: "Failed to fetch notifications" });
    }
};

/**
 * Get unread notification count (Including Virtuals)
 */
export const getUnreadCount = async (req, res) => {
    try {
        const isAdmin = ["Admin", "HR Admin", "HR Manager", "Super Admin"].includes(req.user.role);

        if (isAdmin) {
            let virtualCount = 0;
            const expiringDocs = await CompanyDocument.countDocuments({ status: { $in: ["Expiring Soon", "Critical"] } });
            const pendingReqs = await Request.countDocuments({ status: "PENDING" });
            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();
            const draftPayroll = await Payroll.exists({ month: currentMonth, year: currentYear, status: "DRAFT" });

            if (expiringDocs > 0) virtualCount++;
            if (pendingReqs > 0) virtualCount++;
            if (draftPayroll) virtualCount++;

            // DB unread count (excluding requests which are handled via summary)
            const dbUnread = await Notification.countDocuments({
                recipient: req.user._id,
                isRead: false,
                type: { $ne: "REQUEST" }
            });

            return res.json({ unreadCount: virtualCount + dbUnread });
        }

        const count = await Notification.countDocuments({
            recipient: req.user._id,
            isRead: false,
        });
        res.json({ unreadCount: count });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch unread count" });
    }
};

/**
 * Mark a notification as read
 */
export const markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, recipient: req.user._id },
            { isRead: true },
            { new: true }
        );
        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }
        res.json(notification);
    } catch (error) {
        res.status(500).json({ message: "Failed to update notification" });
    }
};

/**
 * Mark all as read
 */
export const markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.user._id, isRead: false },
            { isRead: true }
        );
        res.json({ message: "All notifications marked as read" });
    } catch (error) {
        res.status(500).json({ message: "Failed to update notifications" });
    }
};

/**
 * Delete a notification
 */
export const deleteNotification = async (req, res) => {
    try {
        const notification = await Notification.findOneAndDelete({
            _id: req.params.id,
            recipient: req.user._id,
        });
        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }
        res.json({ message: "Notification deleted" });
    } catch (error) {
        res.status(500).json({ message: "Failed to delete notification" });
    }
};

/**
 * Helper to create a notification (Internal use)
 */
export const createNotification = async (data) => {
    try {
        await Notification.create(data);
    } catch (error) {
        console.error("Internal Notification Error:", error);
    }
};
