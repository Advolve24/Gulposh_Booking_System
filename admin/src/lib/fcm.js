// admin/src/lib/fcm.js
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { firebaseApp } from "./firebase";

/**
 * Initialize FCM for admin panel
 * @param {Function} onNotification - callback when message arrives
 */
export async function initFCM(onNotification) {
  try {
    const messaging = getMessaging(firebaseApp);

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("🔕 Notification permission denied");
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    });

    if (!token) {
      console.warn("⚠️ No FCM token received");
      return null;
    }

    console.log("✅ FCM TOKEN:", token);

    // 🔔 Foreground message listener
    onMessage(messaging, (payload) => {
      console.log("🔔 FCM FOREGROUND MESSAGE:", payload);

      const notif = {
        title: payload.notification?.title || "Notification",
        message: payload.notification?.body || "",
        type: payload.data?.type || "info",
        data: payload.data || {},
        createdAt: new Date().toISOString(),
      };

      // 👉 hand off to React
      onNotification?.(notif);
    });

    return token;
  } catch (err) {
    console.error("❌ FCM init failed:", err);
    return null;
  }
}
