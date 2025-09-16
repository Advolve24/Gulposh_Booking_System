// admin/src/api/http.js
import axios from "axios";

const API_ROOT = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const api = axios.create({
  baseURL: API_ROOT + "/admin",
  withCredentials: true,
  timeout: 15000,
});

// prevent multiple redirects if many requests 401 at once
let didRedirect = false;
function redirectToLogin() {
  if (didRedirect) return;
  didRedirect = true;
  try { sessionStorage.removeItem("adminUser"); } catch {}
  // Hard navigation so we don't need access to React Router here
  if (window.location.pathname !== "/login") {
    window.location.replace("/login");
  }
}

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const message =
      err.response?.data?.message ||
      err.response?.data ||
      err.message ||
      "";

    if (status === 401 || status === 403) {
      const m = String(message).toLowerCase();
      // treat all auth problems the same
      if (
        m.includes("auth") ||
        m.includes("unauthorized") ||
        m.includes("forbidden") ||
        m.includes("token") ||
        m.includes("jwt") ||
        m.includes("expired")
      ) {
        redirectToLogin();
      }
    }
    return Promise.reject(err);
  }
);
