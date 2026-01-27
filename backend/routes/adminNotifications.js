import express from "express";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { requireAdminSession } from "../middleware/adminSession.js";
import { saveAdminFcmToken } from "../controllers/admin.notification.controller.js";

const router = express.Router();

/**
 * 🔐 Protect all routes (admins only)
 */
router.use(requireAdminSession);

/* =====================================================
   🔔 ADMIN NOTIFICATIONS (DB)
===================================================== */

/**
 * GET admin notifications
 */
router.get("/", async (req, res) => {
  try {
    const notifications = await Notification.find({
      audience: "admin",
    })
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(notifications);
  } catch (err) {
    console.error("Admin notifications fetch failed", err);
    res.status(500).json({ message: "Failed to load notifications" });
  }
});

/**
 * Mark all notifications as read
 */
router.put("/mark-all-read", async (_req, res) => {
  try {
    await Notification.updateMany(
      { audience: "admin", isRead: false },
      { $set: { isRead: true } }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Mark all read failed", err);
    res.status(500).json({ message: "Failed to update notifications" });
  }
});

/* =====================================================
   🔔 ADMIN FCM TOKENS
===================================================== */

/**
 * Save / refresh admin FCM token
 * Called from frontend after FCM init
 */
router.post("/fcm-token", saveAdminFcmToken);

export default router;