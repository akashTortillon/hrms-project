import api from "./getAxiosInstance";

const BASE_URL = "/api/system-settings";

export const getSettings = async () => {
    const res = await api.get(`${BASE_URL}/`);
    return res.data;
};

export const updateGlobalSettings = async (data) => {
    const res = await api.put(`${BASE_URL}/global`, data);
    return res.data;
};

// Holidays
// Holidays
export const addHoliday = async (payload) => {
    // payload: { name, date }
    const res = await api.post(`${BASE_URL}/holidays`, payload);
    return res.data;
};

export const updateHoliday = async (id, payload) => {
    // payload: { name, date }
    const res = await api.put(`${BASE_URL}/holidays/${id}`, payload);
    return res.data;
};

export const deleteHoliday = async (id) => {
    const res = await api.delete(`${BASE_URL}/holidays/${id}`);
    return res.data;
};

// Notifications
export const toggleNotification = async (id) => {
    // id here is the string key like 'doc_expiry'
    const res = await api.put(`${BASE_URL}/notifications/${id}/toggle`);
    return res.data;
};
