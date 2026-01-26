import express from "express";
import Notification from "../models/Notification.js";
import { requireAdminSession } from "../middleware/adminSession.js";

const router = express.Router();

/**
 * 🔐 Protect all routes
 */
router.use(requireAdminSession);

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
router.put("/mark-all-read", async (req, res) => {
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

export default router;