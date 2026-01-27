import Notification from "../models/Notification.js";
import { emitAdmin, hasOnlineAdmins } from "../lib/socket.js";
import { sendAdminPush } from "../lib/fcm.js";

/**
 * Central admin notification helper
 *
 * @param {string} type
 * BOOKING_CREATED | BOOKING_CANCELLED | VILLA_ENQUIRY | NEW_USER | SUPPORT_TICKET
 *
 * @param {object} data
 */
export const notifyAdmin = async (type, data = {}) => {
  let payload = {
    type: "info", // success | warning | info
    title: "Admin Notification",
    message: "New activity detected",
    meta: data,
  };

  /* ---------------- PAYLOAD FORMAT ---------------- */
  switch (type) {
    case "BOOKING_CREATED":
      payload = {
        type: "success",
        title: "New Booking Confirmed",
        message: `Room: ${data.room}
Guest: ${data.guest}
Dates: ${data.dates}
Amount: ₹${data.amount}`,
        meta: data,
      };
      break;

    case "BOOKING_CANCELLED":
      payload = {
        type: "warning",
        title: "Booking Cancelled",
        message: `Room: ${data.room}
Refund: ₹${data.refundAmount} (${data.refundPercentage}%)`,
        meta: data,
      };
      break;

    case "VILLA_ENQUIRY":
      payload = {
        type: "info",
        title: "New Villa Enquiry",
        message: `Guest: ${data.name}
Guests: ${data.guests}
Dates: ${data.dates}`,
        meta: data,
      };
      break;

    case "NEW_USER":
      payload = {
        type: "success",
        title: "New User Registered",
        message: data.email
          ? `${data.name} (${data.email})`
          : `Phone: ${data.phone}`,
        meta: data,
      };
      break;

    case "SUPPORT_TICKET":
      payload = {
        type: "warning",
        title: "New Support Ticket",
        message: `Ticket from ${data.name || "User"}`,
        meta: data,
      };
      break;
  }

  /* ---------------- SAVE TO DATABASE ---------------- */
  /* ---------------- SAVE TO DATABASE ---------------- */
  const notification = await Notification.create({
    type,
    title: payload.title,
    message: payload.message,
    data: payload.meta,
    isRead: false,
    audience: "admin",
  });

  /* ---------------- REALTIME / PUSH ---------------- */
  if (hasOnlineAdmins()) {
    emitAdmin("ADMIN_NOTIFICATION", {
      ...payload,
      _id: notification._id,
      createdAt: notification.createdAt,
      isRead: false,
    });
  } else {
    // 🔔 ADMIN OFFLINE → SEND FCM
    await sendAdminPush(notification);
  }

  return notification;
};
