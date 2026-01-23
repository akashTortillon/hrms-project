import axios from "axios";

// Create shared axios instance
const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE || "http://localhost:5000",
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true, // Important for cookies (refreshToken)
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

// Flag to prevent multiple refresh requests
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// Response Interceptor: Handle Errors
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {

            if (isRefreshing) {
                return new Promise(function (resolve, reject) {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers['Authorization'] = 'Bearer ' + token;
                    return api(originalRequest);
                }).catch(err => {
                    return Promise.reject(err);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Call refresh endpoint
                // We utilize axios directly to avoid interceptor loop for this specific call
                const response = await axios.post(
                    `${api.defaults.baseURL}/api/auth/refresh`,
                    {},
                    { withCredentials: true }
                );

                const { token } = response.data;

                // Save new token
                localStorage.setItem("token", token);

                // Update defaults and original request
                api.defaults.headers.common['Authorization'] = 'Bearer ' + token;
                originalRequest.headers['Authorization'] = 'Bearer ' + token;

                processQueue(null, token);
                isRefreshing = false;

                return api(originalRequest);

            } catch (err) {
                processQueue(err, null);
                isRefreshing = false;

                // Logout user
                localStorage.removeItem("token");
                // localStorage.removeItem("user"); // Clear other auth data if needed

                // Redirect to login only if not already there
                if (window.location.pathname !== "/login") {
                    window.location.href = "/login";
                }

                return Promise.reject(err);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
