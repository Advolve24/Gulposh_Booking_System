// backend/lib/fcm.js
import admin from "../config/firebaseAdmin.js";
import User from "../models/User.js";

/**
 * Send FCM push to all admin devices
 */
export const sendAdminPush = async (notification) => {
  const admins = await User.find({
    isAdmin: true,
    fcmTokens: { $exists: true, $ne: [] },
  }).select("fcmTokens");

  if (!admins.length) {
    console.log("ℹ️ No admin FCM tokens found");
    return;
  }

  const tokens = admins.flatMap((a) => a.fcmTokens);

  if (!tokens.length) return;

  const message = {
    tokens,
    notification: {
      title: notification.title,
      body: notification.message,
    },
    data: {
      type: notification.type,
      id: String(notification._id),
    },
  };

  try {
    const res = await admin.messaging().sendEachForMulticast(message);
    console.log(
      `📨 FCM sent → success: ${res.successCount}, failed: ${res.failureCount}`
    );
  } catch (err) {
    console.error("❌ FCM send failed:", err.message);
  }
};