import { create } from "zustand";

/**
 * Admin Notification Store
 * Used for:
 * - Bell badge count
 * - Toast + realtime socket events
 * - Notifications page
 */
export const useNotificationStore = create((set, get) => ({
  /* ================= STATE ================= */
  items: [],          // all notifications (latest first)
  unread: 0,          // unread count
  lastFetchedAt: null,

  /* ================= ACTIONS ================= */

  /**
   * Add realtime notification (Socket / FCM)
   */
  addNotification: (notification) =>
    set((state) => ({
      items: [
        {
          ...notification,
          isRead: false,
          createdAt: notification.createdAt || new Date().toISOString(),
        },
        ...state.items,
      ],
      unread: state.unread + 1,
    })),

  /**
   * Set notifications from API (initial load)
   */
  setInitial: (items = []) =>
    set({
      items,
      unread: items.filter((n) => !n.isRead).length,
      lastFetchedAt: Date.now(),
    }),

  /**
   * Mark a single notification as read
   */
  markRead: (id) =>
    set((state) => {
      let unread = state.unread;

      const items = state.items.map((n) => {
        if (n._id === id && !n.isRead) {
          unread -= 1;
          return { ...n, isRead: true };
        }
        return n;
      });

      return { items, unread: Math.max(unread, 0) };
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
   * Remove old notifications (retention logic)
   * @param {number} days – default 30
   */
  pruneOld: (days = 30) =>
    set((state) => {
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

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
