import api from "../api/apiClient";

const BASE_URL = "/api/notifications";

/**
 * Fetch top notifications for user
 */
export const fetchNotifications = async () => {
    const response = await api.get(BASE_URL);
    return response.data;
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async () => {
    const response = await api.get(`${BASE_URL}/unread-count`);
    return response.data.unreadCount;
};

/**
 * Mark a single notification as read
 */
export const markNotificationAsRead = async (id) => {
    const response = await api.patch(`${BASE_URL}/${id}/read`);
    return response.data;
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = async () => {
    const response = await api.patch(`${BASE_URL}/read-all`);
    return response.data;
};

/**
 * Delete a notification
 */
export const deleteNotification = async (id) => {
    const response = await api.delete(`${BASE_URL}/${id}`);
    return response.data;
};
