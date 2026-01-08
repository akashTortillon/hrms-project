import axios from "axios";

// axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach token if exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const ATTENDANCE_API = "/api/attendance";

// ✅ Fetch daily attendance for a specific date
export const getDailyAttendance = async (date) => {
  const res = await api.get(ATTENDANCE_API, {
    params: { date },
  });
  return res.data;
};

// ✅ Update attendance record
export const updateAttendance = async (id, data) => {
  const res = await api.put(`${ATTENDANCE_API}/${id}`, data);
  return res.data;
};

// ✅ Mark attendance (create new record)
export const markAttendance = async (data) => {
  const res = await api.post(`${ATTENDANCE_API}/mark`, data);
  return res.data;
};

