import { create } from "zustand";
import { api } from "../api/http";
import { auth } from "@/lib/firebase";

export const useAuth = create((set) => ({
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
  firebaseLoginWithToken: async (idToken) => {
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

  const { data } = await api.get("/auth/me");
  set({ user: data, showAuthModal: false });
  return data;
},


  /* ================= PHONE LOGIN (NON-FIREBASE) ================= */
  phoneLogin: async (payload) => {
    const { data } = await api.post("/auth/phone-login", payload);
    set({ user: data, showAuthModal: false });
    return data;
  },

  /* ================= LOGOUT ================= */
  logout: async () => {
    await api.post("/auth/logout");
    set({ user: null });
  },
}));
