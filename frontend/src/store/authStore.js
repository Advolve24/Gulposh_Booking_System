import { create } from "zustand";
import { api } from "../api/http";

export const useAuth = create((set, get) => ({
  user: null,
  loading: false,
  initialized: false, 

  setUser: (user) => set({ user }),
  showAuthModal: false,
  openAuth: () => set({ showAuthModal: true }),
  closeAuth: () => set({ showAuthModal: false }),

  init: async () => {
    try {
      set({ loading: true });

      const { data } = await api.get("/auth/me");

      set({
        user: data,
        loading: false,
        initialized: true,
      });

      return data;
    } catch {
      set({
        loading: false,
        initialized: true, 
      });
      return null;
    }
  },

  phoneLoginWithToken: async (idToken) => {
    try {
      set({ loading: true });

      await api.post(
        "/auth/phone-login",
        {},
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      const { data } = await api.get("/auth/me");

      set({
        user: data,
        showAuthModal: false,
        loading: false,
        initialized: true,
      });

      return data;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  googleLoginWithToken: async (idToken) => {
    try {
      set({ loading: true });

      await api.post("/auth/google-login", { idToken });

      const { data } = await api.get("/auth/me");

      set({
        user: data,
        showAuthModal: false,
        loading: false,
        initialized: true,
      });

      return data;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  refreshUser: async () => {
    const { data } = await api.get("/auth/me");
    set({ user: data });
    return data;
  },

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      sessionStorage.removeItem("searchParams");
      sessionStorage.removeItem("postAuthRedirect");

      set({
        user: null,
        loading: false,
        initialized: true,
        showAuthModal: false,
      });
    }
  },
}));
