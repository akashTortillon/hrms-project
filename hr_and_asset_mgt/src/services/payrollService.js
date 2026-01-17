
import axios from "axios";

// Create Axios Instance
const api = axios.create({
    baseURL: "http://localhost:5000/api",
    withCredentials: true // Important for cookies
});

// Interceptor for Auth Token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const payrollService = {
    // Generate Payroll for a Month
    generate: async (month, year) => {
        const response = await api.post("/payroll/generate", { month, year });
        return response.data;
    },

    // Get Payroll Summary (Records)
    getSummary: async (month, year) => {
        const response = await api.get(`/payroll/summary?month=${month}&year=${year}`);
        return response.data;
    }
};
