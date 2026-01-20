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
      // 🔥 session expired / invalid
      sessionStorage.removeItem("searchParams");
      set({ user: null, loading: false });
      return null;
    }
  },

  /* ================= FIREBASE PHONE OTP LOGIN ================= */
  firebaseLoginWithToken: async (idToken) => {
    // 1️⃣ Create backend session (cookies)
    const { data } = await api.post(
      "/auth/firebase-login",
      {},
      {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
        withCredentials: true,
      }
    );

    // 2️⃣ Fetch full profile
    const me = await api.get("/auth/me");
    const user = normalizeUser(me.data);

    // 3️⃣ Save user
    set({ user, showAuthModal: false });

    /*
      🔑 IMPORTANT:
      frontend decides redirect using:
      - user.profileComplete
      - data.isNewUser (optional)
    */
    return {
      user,
      isNewUser: data?.isNewUser ?? false,
    };
  },

  /* ================= GOOGLE OAUTH LOGIN ================= */
  googleLoginWithToken: async (idToken) => {
    // 1️⃣ Create backend session
    const { data } = await api.post(
      "/auth/google-login",
      { idToken },
      { withCredentials: true }
    );

    // 2️⃣ Fetch authenticated user
    const me = await api.get("/auth/me");
    const user = normalizeUser(me.data);

    // 3️⃣ Save user
    set({ user, showAuthModal: false });

    return {
      user,
      isNewUser: data?.isNewUser ?? false,
    };
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
      // 🔥 clear all intent
      sessionStorage.removeItem("searchParams");
      sessionStorage.removeItem("postAuthRedirect");
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

/*
  🔐 Profile completion gate
  (matches your CompleteProfile form exactly)
*/
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
