import axios from "axios";
import { useAuth } from "@/store/authStore";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

/* =====================================================
   SESSION HANDLING (REFRESH + NO LOGOUT ON REFRESH)
===================================================== */

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const message = error.response?.data?.message;

    /* 🔁 Access token expired → refresh */
    if (
      status === 401 &&
      message === "TokenExpired" &&
      !original._retry
    ) {
      original._retry = true;
      try {
        await api.post("/auth/refresh", {}, { withCredentials: true });
        return api(original);
      } catch {
        // refresh failed → real logout below
      }
    }

    /* 🚫 DO NOT logout during init or refresh */
    if (
      status === 401 &&
      (original.url?.includes("/auth/me") ||
        original.url?.includes("/auth/refresh"))
    ) {
      return Promise.reject(error);
    }

    /* 🔥 REAL logout (only if refresh failed) */
    if (status === 401) {
      const { logout } = useAuth.getState();
      await logout();
      window.location.replace("/");
    }

    return Promise.reject(error);
  }
);