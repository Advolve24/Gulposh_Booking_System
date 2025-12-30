import { create } from "zustand";
import { adminLogin, adminLogout, adminMe } from "../api/admin";

// store/auth.js
export const useAuth = create((set) => ({
  user: null,
  ready: false,

  setUser: (user) => set({ user }),

  init: async () => {
    const token = localStorage.getItem("admin_token");

    // ✅ No token = don't call /admin/me
    if (!token) {
      set({ user: null, ready: true });
      return;
    }

    try {
      const me = await adminMe();
      set({ user: me, ready: true });
    } catch {
      set({ user: null, ready: true });
    }
  },

  login: async (email, password) => {
    const { user, token } = await adminLogin(email, password);
    localStorage.setItem("admin_token", token);
    localStorage.setItem("admin_user", JSON.stringify(user));
    set({ user });
    return user;
  },

  logout: async () => {
    try { await adminLogout(); } catch {}
    set({ user: null });
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    sessionStorage.removeItem("admin_user");
  },
}));

