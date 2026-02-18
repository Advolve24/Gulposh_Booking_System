import axios from "axios";
import { useAuth } from "@/store/authStore";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
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
        const { logout } = useAuth.getState();
        await logout();
        return Promise.reject(error);
      }
    }
    if (status === 401 && url.includes("/auth/me")) {
      return Promise.reject(error);
    }
    if (status === 401 && url.includes("/auth/refresh")) {
      return Promise.reject(error);
    }
    if (status === 403 && message === "This account has been deleted") {
      const { logout, setUser } = useAuth.getState();
      await logout();
      setUser(null);
      window.location.replace("/");
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

