import { create } from "zustand";
import { api } from "../api/http";

export const useAuth = create((set, get) => ({
  user: null,

  showAuthModal: false,
  openAuth: () => set({ showAuthModal: true }),
  closeAuth: () => set({ showAuthModal: false }),

  init: async () => {
    try {
      const { data } = await api.get("/auth/me");
      set({ user: data });
      return data;
    } catch {
      set({ user: null });
      return null;
    }
  },

  register: async (name, email, password) => {
    const { data } = await api.post("/auth/register", { name, email, password });
    set({ user: data, showAuthModal: false });
    return data;
  },

  login: async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    set({ user: data, showAuthModal: false });
    return data;
  },

  logout: async () => {
    await api.post("/auth/logout");
    set({ user: null });
  },
}));
