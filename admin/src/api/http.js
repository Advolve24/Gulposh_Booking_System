import axios from "axios";
import { toast } from "sonner";
import { useAuth } from "../store/auth";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: false,
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
    const msg = err.response?.data?.message || err.message;

    if ((status === 401 || status === 403) && !isRedirecting) {
      isRedirecting = true;

      const { setUser } = useAuth.getState();
      setUser(null);

      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_user");
      sessionStorage.removeItem("admin_user");

      if (window.location.pathname !== "/login") {
        toast.error("Session expired. Please log in again.");
        window.location.replace("/login");
      }
    } else if (status) {
      console.error("API error:", status, msg);
    }

    return Promise.reject(err);
  }
);
