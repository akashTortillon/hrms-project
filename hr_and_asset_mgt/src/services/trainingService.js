import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE,
    headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

const TRAINING_API = "/api/trainings";

export const getEmployeeTrainings = async (employeeId) => {
    const res = await api.get(`${TRAINING_API}/${employeeId}`);
    return res.data;
};

export const addEmployeeTraining = async (data) => {
    const res = await api.post(TRAINING_API, data);
    return res.data;
};
