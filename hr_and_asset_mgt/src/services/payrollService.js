
import api from "../api/apiClient";

export const payrollService = {
    // Generate Payroll for a Month
    generate: async (month, year) => {
        const response = await api.post("/api/payroll/generate", { month, year });
        return response.data;
    },

    // Get Payroll Summary (Records)
    getSummary: async (month, year) => {
        const response = await api.get(`/api/payroll/summary?month=${month}&year=${year}`);
        return response.data;
    },

    // Add Manual Adjustment
    addAdjustment: async (payload) => {
        const response = await api.post("/api/payroll/adjust", payload);
        return response.data;
    },

    // Finalize Payroll
    finalize: async (month, year) => {
        const response = await api.post("/api/payroll/finalize", { month, year });
        return response.data;
    },

    // Export Excel
    exportExcel: async (month, year) => {
        const response = await api.get(`/api/payroll/export?month=${month}&year=${year}`, {
            responseType: 'blob'
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Payroll_${month}_${year}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
    },

    // Generate SIF
    generateSIF: async (month, year) => {
        const response = await api.get(`/api/payroll/export-sif?month=${month}&year=${year}`, {
            responseType: 'blob'
        });
        // Try to get filename from header
        const contentDisposition = response.headers['content-disposition'];
        let filename = `SIF_${year}${month}.csv`;
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
        const response = await api.get(`/api/payroll/export-mol?month=${month}&year=${year}`, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `MOL_Report_${month}_${year}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
    },

    // Download Payment History
    downloadPaymentHistory: async (year) => {
        const response = await api.get(`/api/payroll/history?year=${year}`, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Payment_History_${year}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
    }
};
