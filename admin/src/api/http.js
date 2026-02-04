import axios from "axios";
import { toast } from "sonner";
import { useAuth } from "../store/auth";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
});


api.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRedirecting = false;

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const url = err.config?.url;

    if (
      status === 401 &&
      (url?.includes("/admin/login") || url?.includes("/admin/me"))
    ) {
      return Promise.reject(err);
    }

    if (status === 401 || status === 403) {
      const { setUser } = useAuth.getState();
      setUser(null);

      if (!window.location.pathname.startsWith("/login")) {
        window.location.replace("/login");
      }
    }

    return Promise.reject(err);
  }
);
