import axios from "axios";

// Create axios instance
const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE,
    headers: {
        "Content-Type": "application/json",
    },
});

// Interceptor for token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    console.log(`[API Request] URL: ${config.baseURL}${config.url}`, config);
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

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
export const addHoliday = async (name) => {
    const res = await api.post(`${BASE_URL}/holidays`, { name });
    return res.data;
};

export const updateHoliday = async (id, name) => {
    const res = await api.put(`${BASE_URL}/holidays/${id}`, { name });
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
