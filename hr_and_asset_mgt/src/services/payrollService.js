
import api from "../api/apiClient";

// Axios requests below use responseType:'blob' (needed for the successful zip/xlsx
// download). The problem: when the backend responds with an error instead (400/500
// JSON), axios STILL decodes it as a Blob because responseType is fixed for the whole
// request - so error.response.data is a Blob object, not the parsed {message} JSON.
// Every caller's `error.message`/`error.response?.data?.message` read was therefore
// always undefined, and every catch block fell back to a hardcoded generic string
// ("SIF Generation failed.") no matter what specific error the backend actually
// returned (missing bank info, no records found, etc). This reads the Blob back as
// text and parses the real message out of it.
const blobErrorMessage = async (error, fallback) => {
    const data = error?.response?.data;
    if (data instanceof Blob) {
        try {
            const text = await data.text();
            const parsed = JSON.parse(text);
            if (parsed?.message) return parsed.message;
        } catch (_) {
            // not JSON / couldn't parse - fall through to fallback
        }
    }
    return error?.response?.data?.message || fallback;
};

export const payrollService = {
    // Generate Payroll for a rolling period — periodStart/periodEnd are "YYYY-MM-DD" strings
    generate: async (periodStart, periodEnd) => {
        const response = await api.post("/payroll/generate", { periodStart, periodEnd });
        return response.data;
    },

    // Get Payroll Summary (Records)
    getSummary: async (month, year, filters = {}) => {
        const params = new URLSearchParams({ month, year, ...filters }).toString();
        const response = await api.get(`/payroll/summary?${params}`);
        return response.data;
    },

    // Latest finalized period — used to lock out already-finalized (and earlier) periods
    getLatestFinalizedPeriod: async () => {
        const response = await api.get("/payroll/latest-finalized");
        return response.data.latestFinalized; // { month, year, periodStart, periodEnd, finalizedAt } or null
    },

    // Add Manual Adjustment
    addAdjustment: async (payload) => {
        const response = await api.post("/payroll/adjust", payload);
        return response.data;
    },

    // Remove Payroll Item — deletes one allowance/deduction line from a DRAFT payroll
    removePayrollItem: async (payrollId, itemId, type) => {
        const response = await api.post("/payroll/remove-item", { payrollId, itemId, type });
        return response.data;
    },

    // Remove an employee's whole record from a DRAFT payroll period (distinct from
    // removePayrollItem above, which only removes one line item within a record)
    removeEmployeeFromPayroll: async (payrollId) => {
        const response = await api.post("/payroll/remove-employee", { payrollId });
        return response.data;
    },

    // Get Audit Logs
    getAuditLogs: async (payrollId) => {
        const response = await api.get(`/payroll/audit-logs?payrollId=${payrollId}`);
        return response.data;
    },

    // Finalize Payroll — same periodStart/periodEnd identity as generate
    finalize: async (periodStart, periodEnd) => {
        const response = await api.post("/payroll/finalize", { periodStart, periodEnd });
        return response.data;
    },

    // Un-finalize Payroll — undo a mistaken Finalize. Only the most recently
    // finalized period is allowed (server enforces this).
    unfinalize: async (periodStart, periodEnd) => {
        const response = await api.post("/payroll/unfinalize", { periodStart, periodEnd });
        return response.data;
    },

    // Set Payroll Period Anchor (Masters > System Settings) — moves the rolling
    // -period lockout cursor without touching any real payroll data. `force: true`
    // overrides the conflict warning if the anchor predates an already-finalized period.
    setAnchor: async (anchorDate, force = false) => {
        const response = await api.post("/payroll/set-anchor", { anchorDate, force });
        return response.data;
    },

    // Export Excel
    exportExcel: async (month, year, reportType = null, filters = {}) => {
        let urlPath = `/payroll/export?month=${month}&year=${year}`;
        if (reportType) urlPath += `&reportType=${reportType}`;
        if (filters.visaCompany) urlPath += `&visaCompany=${encodeURIComponent(filters.visaCompany)}`;
        if (filters.workPermitCompany) urlPath += `&workPermitCompany=${encodeURIComponent(filters.workPermitCompany)}`;
        if (filters.company) urlPath += `&company=${encodeURIComponent(filters.company)}`;
        if (filters.branch) urlPath += `&branch=${encodeURIComponent(filters.branch)}`;

        let response;
        try {
            response = await api.get(urlPath, { responseType: 'blob' });
        } catch (error) {
            throw new Error(await blobErrorMessage(error, "Export failed."));
        }
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;

        // Dynamic filename
        let filename = `Payroll_${month}_${year}.xlsx`;
        if (reportType === 'permit') filename = `Location_Report_${month}_${year}.xlsx`;
        else if (reportType === 'visa') filename = `Visa_Report_${month}_${year}.xlsx`;

        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
    },

    // Generate SIF — periodStart/periodEnd (optional) are the exact period the
    // Finalize/Un-finalize badges key off; passing them avoids a mismatch against the
    // derived month/year if the date picker's periodEnd and the actually-finalized
    // period ever disagree.
    generateSIF: async (month, year, periodStart = null, periodEnd = null) => {
        let urlPath = `/payroll/export-sif?month=${month}&year=${year}`;
        if (periodStart && periodEnd) urlPath += `&periodStart=${periodStart}&periodEnd=${periodEnd}`;
        let response;
        try {
            response = await api.get(urlPath, {
                responseType: 'blob'
            });
        } catch (error) {
            throw new Error(await blobErrorMessage(error, "SIF Generation failed."));
        }
        // Try to get filename from header
        const contentDisposition = response.headers['content-disposition'];
        let filename = `SIF_${year}${month}.zip`;
        if (contentDisposition) {
            const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
            if (fileNameMatch && fileNameMatch.length === 2)
                filename = fileNameMatch[1];
        }

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
    },

    // Download MOL Report
    downloadMOLReport: async (month, year) => {
        let response;
        try {
            response = await api.get(`/payroll/export-mol?month=${month}&year=${year}`, { responseType: 'blob' });
        } catch (error) {
            throw new Error(await blobErrorMessage(error, "Failed to download MOL Report."));
        }
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `MOL_Report_${month}_${year}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
    },

    // Download Payment History — month is optional (whole year if omitted)
    downloadPaymentHistory: async (year, month = null) => {
        let urlPath = `/payroll/history?year=${year}`;
        if (month) urlPath += `&month=${month}`;
        let response;
        try {
            response = await api.get(urlPath, { responseType: 'blob' });
        } catch (error) {
            throw new Error(await blobErrorMessage(error, "Failed to download History."));
        }
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', month ? `Payment_History_${month}_${year}.xlsx` : `Payment_History_${year}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
    },

    // Download Employee Payslip PDF
    downloadPayslipPdf: async (payrollId, employeeName = "employee") => {
        const response = await api.get(`/payroll/download/${payrollId}`, {
            responseType: 'blob'
        });
        const safeName = String(employeeName || "employee").replace(/[^a-z0-9_-]+/gi, "_");
        const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Payslip_${safeName}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);
    },

    // Self-service: employee's own processed payslips
    getMyPayslips: async () => {
        const response = await api.get("/payroll/my-payslips");
        return response.data;
    }
};
