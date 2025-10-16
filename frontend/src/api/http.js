import axios from "axios";

const DEFAULT_API = import.meta.env.DEV
  ? "http://localhost:5000/api"
  : "https://villa-gulposh.onrender.com/api";

const baseURL = (import.meta.env.VITE_API_URL || DEFAULT_API).replace(/\/$/, "");


export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      error.response?.data?.message === "TokenExpired" &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      await api.post("/auth/refresh");
      return api(originalRequest);
    }
    return Promise.reject(error);
  }
);
