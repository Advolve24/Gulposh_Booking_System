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

 /* ================= HANDLE GOOGLE REDIRECT ================= */
  handleRedirectResult: async () => {
    try {
      const result = await getRedirectResult(auth);

      if (!result?.user) return null;

      console.log("✅ Firebase Google redirect success");

      const idToken = await result.user.getIdToken(true);

      // 🔐 Create backend session
      await api.post(
        "/auth/google-login",
        { idToken },
        { withCredentials: true }
      );

      // 👤 Fetch authenticated user
      const { data } = await api.get("/auth/me");
      const user = normalizeUser(data);

      set({ user, showAuthModal: false });
      return user;
    } catch (err) {
      console.error("❌ Google redirect failed", err);
      return null;
    }
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
    await api.post("/auth/logout");
    set({ user: null });
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
