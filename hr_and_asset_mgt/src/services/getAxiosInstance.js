import axios from "axios";

// Create shared axios instance
const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE,
    headers: {
        "Content-Type": "application/json",
    },
});

// Request Interceptor: Attach Token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Response Interceptor: Handle Errors (Optional but good practice)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // You could handle 401 Unauthorized here globally if needed
        return Promise.reject(error);
    }
);

export default api;
