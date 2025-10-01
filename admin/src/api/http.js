import axios from "axios";
import { toast } from "sonner";
import { useAuth } from "../store/auth";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
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

      sessionStorage.removeItem("adminUser");
      localStorage.removeItem("adminUser");

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
