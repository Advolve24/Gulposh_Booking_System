import { emitAdmin, hasOnlineAdmins } from "../lib/socket.js";
// later you can add FCM here

export async function notifyAdmin(type, data) {
  const payload = {
    type,
    data,
    timestamp: new Date().toISOString(),
  };

  // 1️⃣ Socket notification (online admins)
  if (hasOnlineAdmins()) {
    emitAdmin("ADMIN_NOTIFICATION", payload);
  }

  // 2️⃣ FCM push (offline admins) – add later
  // await sendFCM(payload);
}
