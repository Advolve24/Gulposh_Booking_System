import axios from "axios";
import { useAuth } from "@/store/authStore";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

if (import.meta.env.DEV) {
  console.log("API BASE URL:", API_BASE_URL);
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

/* =====================================================
   SESSION HANDLING (REFRESH + AUTO LOGOUT)
===================================================== */

let isLoggingOut = false;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const message = error.response?.data?.message;

    /* ================= TOKEN EXPIRED → REFRESH ================= */
    if (
      status === 401 &&
      message === "TokenExpired" &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        await api.post("/auth/refresh");
        return api(originalRequest);
      } catch {
        // refresh failed → logout below
      }
    }

    /* ================= PROFILE INCOMPLETE (NOT LOGOUT) ================= */
    if (status === 401 && message === "PROFILE_INCOMPLETE") {
      window.location.replace("/complete-profile");
      return Promise.reject(error);
    }

    /* ================= REAL AUTH FAILURE ================= */
    if (status === 401 && !isLoggingOut) {
      isLoggingOut = true;

      try {
        sessionStorage.removeItem("searchParams");
        sessionStorage.removeItem("postAuthRedirect");

        const { logout } = useAuth.getState();
        await logout();
      } catch (e) {
        console.error("Auto logout failed", e);
      } finally {
        window.location.replace("/");
      }
    }

    return Promise.reject(error);
  }
);
