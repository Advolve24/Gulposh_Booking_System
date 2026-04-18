import axios from "axios";
import { useAuth } from "../store/authStore";

const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host.includes("villagulposh.com")) {
      return "https://booking.villagulposh.com/api";
    }
  }
  return "http://localhost:5000/api";
};

export const api = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
});


api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const message = error.response?.data?.message;
    const url = original?.url || "";

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
      }
    }

    if (
      status === 401 &&
      (url.includes("/auth/me") || url.includes("/auth/refresh"))
    ) {
      return Promise.reject(error);
    }
    if (status === 403 && message === "This account has been deleted") {
      const { logout, setUser } = useAuth.getState();
      await logout();
      setUser(null);
      window.location.replace("/");
      return Promise.reject(error);
    }

    if (status === 401) {
      const { logout } = useAuth.getState();
      await logout();
      window.location.replace("/");
    }
    return Promise.reject(error);
  }
);
