import axios from "axios";

export const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || "http://localhost:5000/api") + "/admin",
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const msg = err.response?.data || err.message;
    if (status === 401 || status === 403) {
      console.warn("Auth error:", status, msg);
    } else {
      console.error(msg);
    }
    return Promise.reject(err);
  }
);
