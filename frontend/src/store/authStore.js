import { create } from "zustand";
import { api } from "../api/http";

/* =====================================================
   AUTH STORE (NO NAVIGATION HERE)
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

      const { data } = await api.get("/auth/me");

      // 🔑 Trust backend response
      set({ user: data, loading: false });
      return data;
    } catch {
      sessionStorage.removeItem("searchParams");
      set({ user: null, loading: false });
      return null;
    }
  },

  /* ================= PHONE OTP LOGIN ================= */
  phoneLoginWithToken: async (idToken) => {
    // 1️⃣ Create backend session using Firebase ID token
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
    const { data } = await api.get("/auth/me");

    // 3️⃣ Save user (NO redirect here)
    set({ user: data, showAuthModal: false });

    return data;
  },

  /* ================= GOOGLE OAUTH LOGIN ================= */
  googleLoginWithToken: async (idToken) => {
    // 1️⃣ Backend creates session (cookies)
    await api.post(
      "/auth/google-login",
      { idToken },
      { withCredentials: true }
    );

    // 2️⃣ Fetch authenticated user
    const { data } = await api.get("/auth/me");

    // 3️⃣ Save user
    set({ user: data, showAuthModal: false });

    return data;
  },

  /* ================= AFTER PROFILE UPDATE ================= */
  refreshUser: async () => {
    const { data } = await api.get("/auth/me");
    set({ user: data });
    return data;
  },

  /* ================= LOGOUT ================= */
  logout: async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      // 🔥 Clear any pending intent
      sessionStorage.removeItem("searchParams");
      sessionStorage.removeItem("postAuthRedirect");

      set({ user: null });
    }
  },
}));
