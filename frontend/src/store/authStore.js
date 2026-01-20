import { create } from "zustand";
import { api } from "../api/http";

/* =====================================================
   AUTH STORE (BACKEND IS SOURCE OF TRUTH)
===================================================== */

export const useAuth = create((set, get) => ({
  user: null,
  loading: false,

  /* ================= UI ================= */

  showAuthModal: false,
  openAuth: () => set({ showAuthModal: true }),
  closeAuth: () => set({ showAuthModal: false }),

  /* ================= INIT SESSION ================= */

  init: async () => {
    try {
      set({ loading: true });

      const { data } = await api.get("/auth/me", {
        withCredentials: true,
      });

      set({ user: data, loading: false });
      return data;
    } catch {
      sessionStorage.removeItem("searchParams");
      sessionStorage.removeItem("postAuthRedirect");

      set({ user: null, loading: false });
      return null;
    }
  },

  /* ================= PHONE OTP LOGIN ================= */

  phoneLoginWithToken: async (idToken) => {
    try {
      set({ loading: true });

      // 1️⃣ Create backend session
      await api.post(
        "/auth/phone-login",
        {},
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
          withCredentials: true,
        }
      );

      // 2️⃣ Fetch authenticated user
      const { data } = await api.get("/auth/me", {
        withCredentials: true,
      });

      // 3️⃣ Save user
      set({ user: data, showAuthModal: false, loading: false });
      return data;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  /* ================= GOOGLE OAUTH LOGIN ================= */

  googleLoginWithToken: async (idToken) => {
    try {
      set({ loading: true });

      // 1️⃣ Backend creates session
      await api.post(
        "/auth/google-login",
        { idToken },
        { withCredentials: true }
      );

      // 2️⃣ Fetch authenticated user
      const { data } = await api.get("/auth/me", {
        withCredentials: true,
      });

      // 3️⃣ Save user
      set({ user: data, showAuthModal: false, loading: false });
      return data;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  /* ================= REFRESH USER ================= */

  refreshUser: async () => {
    const { data } = await api.get("/auth/me", {
      withCredentials: true,
    });

    set({ user: data });
    return data;
  },

  /* ================= LOGOUT ================= */

  logout: async () => {
    try {
      await api.post("/auth/logout", {}, { withCredentials: true });
    } finally {
      sessionStorage.removeItem("searchParams");
      sessionStorage.removeItem("postAuthRedirect");

      set({ user: null });
    }
  },
}));
