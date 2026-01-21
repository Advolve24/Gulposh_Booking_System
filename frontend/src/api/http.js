import axios from "axios";
import { useAuth } from "@/store/authStore";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

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
    const url = originalRequest?.url || "";

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
        // fall through to logout
      }
    }

    /* ================= IGNORE INIT CHECK FAILURES ================= */
    // 🚫 DO NOT LOGOUT on page refresh auth checks
    if (
      status === 401 &&
      (url.includes("/auth/me") || url.includes("/auth/refresh"))
    ) {
      return Promise.reject(error);
    }

    /* ================= PROFILE INCOMPLETE ================= */
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
