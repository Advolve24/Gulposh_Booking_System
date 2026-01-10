import { create } from "zustand";
import { api } from "../api/http";
import { auth } from "@/lib/firebase";

export const useAuth = create((set, get) => ({
  user: null,

  /* ================= UI ================= */
  showAuthModal: false,
  openAuth: () => set({ showAuthModal: true }),
  closeAuth: () => set({ showAuthModal: false }),

  /* ================= INIT SESSION ================= */
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

  /* ================= FIREBASE OTP LOGIN ================= */
  firebaseLoginWithToken: async (idToken, navigate) => {
    // 1️⃣ Backend session creation
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

    // 2️⃣ Fetch user profile
    const { data: user } = await api.get("/auth/me");
    set({ user, showAuthModal: false });

    // 3️⃣ Redirect NEW / INCOMPLETE users
    if (!user.profileComplete) {
      navigate?.("/complete-profile");
    }

    return user;
  },

  /* ================= PHONE LOGIN (LEGACY / NON-FIREBASE) ================= */
  phoneLogin: async (payload, navigate) => {
    const { data: user } = await api.post("/auth/phone-login", payload);
    set({ user, showAuthModal: false });

    if (!user.profileComplete) {
      navigate?.("/complete-profile");
    }

    return user;
  },

  /* ================= LOGOUT ================= */
  logout: async () => {
    await api.post("/auth/logout");
    set({ user: null });
  },
}));
