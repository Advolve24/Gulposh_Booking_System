import User from "../models/User.js";

/* ===============================
   PROFILE COMPLETION REQUIRED
================================ */
export async function profileRequired(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select("name dob");

    if (!user) {
      return res.status(401).json({
        code: "USER_NOT_FOUND",
        message: "User not found",
      });
    }

    // 🔒 Block if profile incomplete
    if (!user.name || user.name === "Guest" || !user.dob) {
      return res.status(403).json({
        code: "PROFILE_INCOMPLETE",
        message: "Please complete your profile",
      });
    }

    next();
  } catch (err) {
    console.error("profileRequired error:", err);
    res.status(500).json({
      message: "Profile validation failed",
    });
  }
}
