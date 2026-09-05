import api from "../api/apiClient";

const BASE_URL = "/system-settings";

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

// Allowance Types
export const addAllowanceType = async (payload) => {
    // payload: { name }
    const res = await api.post(`${BASE_URL}/allowance-types`, payload);
    return res.data;
};

export const updateAllowanceType = async (id, payload) => {
    const res = await api.put(`${BASE_URL}/allowance-types/${id}`, payload);
    return res.data;
};

export const deleteAllowanceType = async (id) => {
    const res = await api.delete(`${BASE_URL}/allowance-types/${id}`);
    return res.data;
};

// Notifications
export const toggleNotification = async (id) => {
    // id here is the string key like 'doc_expiry'
    const res = await api.put(`${BASE_URL}/notifications/${id}/toggle`);
    return res.data;
};

// Backup - mounted at /api/backup directly, not under BASE_URL. Async job pattern:
// start returns immediately with a jobId, status is polled, download is only called
// once status is "ready" (server 302s to a fresh short-lived S3 presigned URL, which
// axios follows transparently). Replaces the old single-call synchronous download,
// which held one long HTTP request open for the whole ~40-50s backup and was
// confirmed to fail on slower mobile connections before it could complete.
export const startBackupJob = async () => {
    const res = await api.post(`/backup/start`);
    return res.data; // { jobId, status }
};

export const getBackupJobStatus = async (jobId) => {
    const res = await api.get(`/backup/status/${jobId}`);
    return res.data;
};

// Returns the signed S3 URL as JSON, not a redirect the browser has to follow via
// fetch/XHR (that path needs the bucket's CORS to allowlist whatever origin is
// calling, which failed even for this app's existing, already-live document-download
// endpoint when tested from a non-prod origin). The caller does a plain <a href>
// navigation to this URL instead - no CORS involved, no bucket config dependency.
export const getBackupDownloadUrl = async (jobId) => {
    const res = await api.get(`/backup/download/${jobId}`);
    return res.data.url;
};
