import { create } from "zustand";
import { api } from "../api/http";

/* =====================================================
   AUTH STORE
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

      set({
        user: {
          ...data,
          profileComplete: isProfileComplete(data),
        },
        loading: false,
      });

      return data;
    } catch {
      set({ user: null, loading: false });
      return null;
    }
  },

  /* ================= FIREBASE OTP LOGIN ================= */
  firebaseLoginWithToken: async (idToken, navigate) => {
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

    // 2️⃣ Fetch full profile
    const { data } = await api.get("/auth/me");

    const user = {
      ...data,
      profileComplete: isProfileComplete(data),
    };

    set({ user, showAuthModal: false });

    // 3️⃣ Redirect if needed
    if (!user.profileComplete) {
      navigate?.("/complete-profile", { replace: true });
    }

    return user;
  },

  /* ================= PHONE OTP LOGIN ================= */
  phoneLogin: async (payload, navigate) => {
    await api.post("/auth/phone-login", payload);

    // Fetch fresh profile
    const { data } = await api.get("/auth/me");

    const user = {
      ...data,
      profileComplete: isProfileComplete(data),
    };

    set({ user, showAuthModal: false });

    if (!user.profileComplete) {
      navigate?.("/complete-profile", { replace: true });
    }

    return user;
  },

  /* ================= AFTER PROFILE UPDATE ================= */
  refreshUser: async () => {
    const { data } = await api.get("/auth/me");

    set({
      user: {
        ...data,
        profileComplete: isProfileComplete(data),
      },
    });

    return data;
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

function isProfileComplete(user) {
  if (!user) return false;

  return Boolean(
    user.name &&
    user.phone &&
    user.dob &&
    user.address &&
    user.country &&
    user.state &&
    user.city &&
    user.pincode
  );
}
