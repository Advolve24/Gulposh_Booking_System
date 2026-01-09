// frontend/src/api/http.js
import axios from "axios";

/* ===============================
   API BASE URL
================================ */

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

if (import.meta.env.DEV) {
  console.log("API BASE URL:", API_BASE_URL);
}

/* ===============================
   AXIOS INSTANCE (NAMED EXPORT)
================================ */

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

/* ===============================
   RESPONSE INTERCEPTOR
================================ */

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      error.response?.data?.message === "TokenExpired" &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        await api.post("/auth/refresh");
        return api(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
