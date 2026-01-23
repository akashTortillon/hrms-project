import api from "../api/apiClient";

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

// ✅ Get Employee Attendance Stats
export const getEmployeeAttendanceStats = async (employeeId) => {
  const res = await api.get(`${ATTENDANCE_API}/stats/${employeeId}`);
  return res.data;
};

// ✅ Sync Biometrics
export const syncBiometrics = async () => {
  const res = await api.post(`${ATTENDANCE_API}/sync`);
  return res.data;
};

// ✅ Get Monthly Attendance
export const getMonthlyAttendance = async (month, year) => {
  const res = await api.get(`${ATTENDANCE_API}/monthly`, {
    params: { month, year }
  });
  return res.data;
};

// ✅ Export Report
export const exportAttendanceReport = async (filters) => {
  const res = await api.get(`${ATTENDANCE_API}/export`, {
    params: filters,
    responseType: "blob", // Important for file download
  });
  return res.data;
};

// ✅ Get Employee Attendance History
export const getEmployeeAttendanceHistory = async (employeeId, month, year) => {
  const res = await api.get(`${ATTENDANCE_API}/history/${employeeId}`, {
    params: { month, year }
  });
  return res.data;
};

