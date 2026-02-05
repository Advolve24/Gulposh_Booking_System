import axios from "axios";
import { useAuth } from "../store/auth";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
});



api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const url = err.config?.url || "";

    if (
      (status === 401 || status === 403) &&
      url.startsWith("/admin") &&
      !window.location.pathname.startsWith("/login")
    ) {
      useAuth.getState().setUser(null);
      window.location.replace("/login");
    }

    return Promise.reject(err);
  }
);

