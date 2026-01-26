import { create } from "zustand";

/**
 * Admin Notification Store
 *
 * Used for:
 * - Bell badge count
 * - Toast + realtime socket events
 * - Notifications page (Settings)
 * - Future FCM push notifications
 */
export const useNotificationStore = create((set, get) => ({
  /* ================= STATE ================= */
  items: [],           // latest first
  unread: 0,
  lastFetchedAt: null, // for API sync / pagination later

  /* ================= HELPERS ================= */
  _normalize: (n) => ({
    id: n.id || n._id || crypto.randomUUID(),
    title: n.title || "Notification",
    message: n.message || "",
    type: n.type || "info", // success | info | warning | error
    meta: n.meta || {},
    isRead: Boolean(n.isRead),
    createdAt: n.createdAt || new Date().toISOString(),
  }),

  /* ================= ACTIONS ================= */

  /**
   * Add realtime notification (Socket / FCM)
   */
  addNotification: (notification) =>
    set((state) => {
      const normalized = get()._normalize({
        ...notification,
        isRead: false,
      });

      return {
        items: [normalized, ...state.items],
        unread: state.unread + 1,
      };
    }),

  /**
   * Set notifications from API (initial load)
   */
  setInitial: (items = []) =>
    set(() => {
      const normalized = items.map((n) =>
        get()._normalize(n)
      );

      return {
        items: normalized,
        unread: normalized.filter((n) => !n.isRead).length,
        lastFetchedAt: Date.now(),
      };
    }),

  /**
   * Mark a single notification as read
   */
  markRead: (id) =>
    set((state) => {
      let unread = state.unread;

      const items = state.items.map((n) => {
        if (n.id === id && !n.isRead) {
          unread -= 1;
          return { ...n, isRead: true };
        }
        return n;
      });

      return {
        items,
        unread: Math.max(unread, 0),
      };
    }),

  /**
   * Mark all notifications as read
   */
  markAllRead: () =>
    set((state) => ({
      items: state.items.map((n) => ({ ...n, isRead: true })),
      unread: 0,
    })),

  /**
   * Retention cleanup
   * Default: keep last 30 days
   */
  pruneOld: (days = 30) =>
    set((state) => {
      const cutoff =
        Date.now() - days * 24 * 60 * 60 * 1000;

      const items = state.items.filter(
        (n) => new Date(n.createdAt).getTime() >= cutoff
      );

      return {
        items,
        unread: items.filter((n) => !n.isRead).length,
      };
    }),

  /**
   * Reset store (logout / admin switch)
   */
  reset: () =>
    set({
      items: [],
      unread: 0,
      lastFetchedAt: null,
    }),
}));
