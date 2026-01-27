// admin/src/lib/fcm.js
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { firebaseApp } from "./firebase";

/**
 * Initialize FCM for admin panel
 * - Foreground notifications (tab open)
 * - Background notifications (tab closed) via Service Worker
 *
 * @param {Function} onNotification - callback when message arrives
 */
export async function initFCM(onNotification) {
  try {
    // 🔹 Browser support check
    if (!("serviceWorker" in navigator)) {
      console.warn("❌ Service workers not supported");
      return null;
    }

    // 🔹 Register Firebase Messaging Service Worker
    const swRegistration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js"
    );

    const messaging = getMessaging(firebaseApp);

    // 🔹 Ask permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("🔕 Notification permission denied");
      return null;
    }

    // 🔹 Get FCM token (IMPORTANT: pass service worker)
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    });

    if (!token) {
      console.warn("⚠️ No FCM token received");
      return null;
    }

    console.log("✅ FCM TOKEN:", token);

    // 🔔 FOREGROUND messages (tab open)
    onMessage(messaging, (payload) => {
      console.log("🔔 FCM FOREGROUND MESSAGE:", payload);

      const notif = {
        title: payload.notification?.title || "Notification",
        message: payload.notification?.body || "",
        type: payload.data?.type || "info",
        data: payload.data || {},
        createdAt: new Date().toISOString(),
      };

      onNotification?.(notif);
    });

    return token;
  } catch (err) {
    console.error("❌ FCM init failed:", err);
    return null;
  }
}