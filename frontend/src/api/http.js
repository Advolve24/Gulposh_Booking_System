// utils/api.js
import axios from "axios";

const baseURL = import.meta.env.DEV
  ? "http://localhost:5000/api"
  : "https://gulposh-booking-system.onrender.com/api";

export const api = axios.create({
  baseURL,
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
