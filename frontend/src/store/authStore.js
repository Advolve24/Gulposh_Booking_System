authstore.js

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

      const user = normalizeUser(data);

      set({ user, loading: false });
      return user;
    } catch {
      sessionStorage.removeItem("searchParams");
      set({ user: null, loading: false });
      return null;
    }
  },

  /* ================= FIREBASE OTP LOGIN ================= */
  firebaseLoginWithToken: async (idToken) => {
    // 1️⃣ Create backend session
    await api.post(
      "/auth/firebase-login",
      {},
      {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
        withCredentials: true,
      }
    );

    // 2️⃣ Fetch profile
    const { data } = await api.get("/auth/me");

    const user = normalizeUser(data);

    // 3️⃣ Save user ONLY (NO REDIRECT HERE)
    set({ user, showAuthModal: false });

    return user;
  },

  /* ================= GOOGLE OAUTH LOGIN ================= */
  googleLoginWithToken: async (idToken) => {
    // 1️⃣ Create backend session (sets cookies)
    await api.post(
      "/auth/google-login",
      { idToken },
      { withCredentials: true }
    );

    // 2️⃣ Fetch authenticated user (READS COOKIES)
    const { data } = await api.get("/auth/me");

    const user = normalizeUser(data);

    // 3️⃣ Save user
    set({ user, showAuthModal: false });

    return user;
  },



  /* ================= AFTER PROFILE UPDATE ================= */
  refreshUser: async () => {
    const { data } = await api.get("/auth/me");

    const user = normalizeUser(data);
    set({ user });

    return user;
  },

  /* ================= LOGOUT ================= */
  logout: async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      // 🔥 Clear search intent
      sessionStorage.removeItem("searchParams");

      set({ user: null });
    }
  },

}));

/* =====================================================
   HELPERS
===================================================== */

function normalizeUser(user) {
  if (!user) return null;

  return {
    ...user,
    profileComplete: isProfileComplete(user),
  };
}

function isProfileComplete(user) {
  return Boolean(
    user?.name &&
    user?.phone &&
    user?.dob &&
    user?.address &&
    user?.country &&
    user?.state &&
    user?.city &&
    user?.pincode
  );
}
