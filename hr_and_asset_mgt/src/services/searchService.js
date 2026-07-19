import api from "../api/apiClient";

export const performGlobalSearch = async (query) => {
    try {
        const res = await api.get(`/search?query=${encodeURIComponent(query)}`);
        return res.data;
    } catch (error) {
        console.error("Global search error:", error);
        throw error;
    }
};
