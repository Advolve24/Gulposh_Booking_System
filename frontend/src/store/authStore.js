import { create } from "zustand";
import { api } from "../api/http";

/* =====================================================
   AUTH STORE (COOKIE-BASED, BACKEND IS SOURCE OF TRUTH)
   Airbnb / Booking.com Style
===================================================== */

export const useAuth = create((set, get) => ({
  /* ================= STATE ================= */

  user: null,
  loading: false,

  /* ================= UI ================= */

  showAuthModal: false,
  openAuth: () => set({ showAuthModal: true }),
  closeAuth: () => set({ showAuthModal: false }),

  /* ================= INIT SESSION =================
     ⚠️ CRITICAL RULE:
     - NEVER logout here
     - Init failure ≠ logout
  =============================================== */

  init: async () => {
    try {
      set({ loading: true });

      const { data } = await api.get("/auth/me");
      set({ user: data, loading: false });

      return data;
    } catch (err) {
      // 🚫 DO NOT clear user here
      // 🚫 DO NOT logout here
      set({ loading: false });
      return null;
    }
  },

  /* ================= PHONE OTP LOGIN ================= */

  phoneLoginWithToken: async (idToken) => {
    try {
      set({ loading: true });

      // 1️⃣ Backend creates session (cookies)
      await api.post(
        "/auth/phone-login",
        {},
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      // 2️⃣ Fetch authenticated user
      const { data } = await api.get("/auth/me");

      // 3️⃣ Save user in store
      set({
        user: data,
        showAuthModal: false,
        loading: false,
      });

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

      // 1️⃣ Backend creates session (cookies)
      await api.post("/auth/google-login", { idToken });

      // 2️⃣ Fetch authenticated user
      const { data } = await api.get("/auth/me");

      // 3️⃣ Save user in store
      set({
        user: data,
        showAuthModal: false,
        loading: false,
      });

      return data;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  /* ================= REFRESH USER (MANUAL) ================= */

  refreshUser: async () => {
    const { data } = await api.get("/auth/me");
    set({ user: data });
    return data;
  },

  /* ================= LOGOUT =================
     ✅ ONLY place where user is cleared
  =========================================== */

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      sessionStorage.removeItem("searchParams");
      sessionStorage.removeItem("postAuthRedirect");

      set({
        user: null,
        loading: false,
        showAuthModal: false,
      });
    }
  },
}));
