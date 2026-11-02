import axios from "axios";
import { getCsrfToken, handleExpiredSession } from "@/lib/auth-session";

export const apiBaseUrl = import.meta.env.VITE_API_URL;

const api = axios.create({
    baseURL: apiBaseUrl,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
});

api.interceptors.request.use(
    (config) => {
        const method = config.method?.toLowerCase();
        const isSafeMethod = method === "get" || method === "head" || method === "options";
        const csrfToken = getCsrfToken();

        if (!isSafeMethod && csrfToken) {
            config.headers.set("X-CSRF-Token", csrfToken);
        }

        return config;
    },
    (error) => Promise.reject(error),
);

api.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
        if (
            axios.isAxiosError(error) &&
            error.response?.status === 401 &&
            !error.config?.url?.endsWith("/auth/login")
        ) {
            handleExpiredSession();
        }
        return Promise.reject(error);
    },
);

export default api;
