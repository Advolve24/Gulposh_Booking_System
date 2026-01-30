import User from "../models/User.js";

export const saveAdminFcmToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: "FCM token required" });
    }

    const adminId = req.user.id;

    const admin = await User.findById(adminId);
    if (!admin || !admin.isAdmin) {
      return res.status(403).json({ message: "Admins only" });
    }

    await User.updateOne(
      { _id: adminId },
      { $addToSet: { fcmTokens: token } }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("SAVE FCM TOKEN ERROR:", err);
    res.status(500).json({ message: "Failed to save FCM token" });
  }
};