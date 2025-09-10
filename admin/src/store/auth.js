import { create } from "zustand";
import { adminLogin, adminLogout, adminMe } from "../api/admin";

export const useAuth = create((set) => ({
  user: null,
  ready: false,

  setUser: (user) => set({ user }),

  init: async () => {
    try {
      const me = await adminMe();     
      set({ user: me, ready: true });
    } catch {
      set({ user: null, ready: true });
    }
  },

  login: async (email, password) => {
    const me = await adminLogin(email, password); 
    set({ user: me });
    sessionStorage.setItem("adminUser", JSON.stringify(me));
  },

  logout: async () => {
    try { await adminLogout(); } catch {}
    set({ user: null });
    sessionStorage.removeItem("adminUser");
  },
}));
