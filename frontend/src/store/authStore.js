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
  initialized: false, // 🔥 REQUIRED

  /* ================= UI ================= */

  showAuthModal: false,
  openAuth: () => set({ showAuthModal: true }),
  closeAuth: () => set({ showAuthModal: false }),

  /* ================= INIT SESSION =================
     ⚠️ CRITICAL RULES:
     - NEVER logout here
     - NEVER clear user here
     - Just mark initialized when done
  =============================================== */

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
        initialized: true, // ✅ auth check completed
      });
      return null;
    }
  },

  /* ================= PHONE OTP LOGIN ================= */

  phoneLoginWithToken: async (idToken) => {
    try {
      set({ loading: true });

      // Backend creates session (cookies)
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

  /* ================= GOOGLE OAUTH LOGIN ================= */

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

  /* ================= REFRESH USER (OPTIONAL) ================= */

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
        initialized: true,
        showAuthModal: false,
      });
    }
  },
}));
