import axios from "axios";
import { useAuth } from "@/store/authStore";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

/* =====================================================
   SESSION HANDLING (AIRBNB-STYLE)
===================================================== */

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const message = error.response?.data?.message;
    const url = original?.url || "";

    // 🔁 ACCESS TOKEN EXPIRED → REFRESH
    if (
      original &&
      status === 401 &&
      message === "TokenExpired" &&
      !original._retry
    ) {
      original._retry = true;

      try {
        await api.post("/auth/refresh");
        return api(original);
      } catch {
        // refresh failed → logout below
      }
    }

    // 🚫 NEVER logout during init or refresh
    if (
      status === 401 &&
      (url.includes("/auth/me") || url.includes("/auth/refresh"))
    ) {
      return Promise.reject(error);
    }

    // 🔥 REAL LOGOUT (ONLY HERE)
    if (status === 401) {
      const { logout } = useAuth.getState();
      await logout();
      window.location.replace("/");
    }

    return Promise.reject(error);
  }
);
