import api from "../api/apiClient";

const ATTENDANCE_API = "/attendance";

// ✅ Fetch daily attendance for a specific date (with pagination/filters)
export const getDailyAttendance = async (params) => {
  // params can be { date, page, limit, status, search } or just date string (backward compatibility check)
  const queryParams = typeof params === 'object' ? params : { date: params };

  const res = await api.get(ATTENDANCE_API, {
    params: queryParams,
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
// Pass { from, to } (YYYY-MM-DD) to view a custom range such as the 22nd -> 22nd cycle;
// without them the calendar month/year is used.
export const getMonthlyAttendance = async (month, year, range = {}) => {
  const params = range.from && range.to
    ? { from: range.from, to: range.to }
    : { month, year };
  const res = await api.get(`${ATTENDANCE_API}/monthly`, { params });
  return res.data;
};

// ✅ Employees with Incomplete attendance (check-in, no check-out) for a day
export const getIncompleteAttendance = async (date) => {
  const res = await api.get(`${ATTENDANCE_API}/incomplete`, { params: { date } });
  return res.data;
};

// ✅ Mark selected Incomplete employees Present, check-out = end of their shift
export const massCompleteAttendance = async (data) => {
  const res = await api.post(`${ATTENDANCE_API}/mass-complete`, data);
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


// ✅ Mark attendance for a date range (bulk)
export const markAttendanceBulk = async (data) => {
  const res = await api.post(`${ATTENDANCE_API}/mark-bulk`, data);
  return res.data;
};
