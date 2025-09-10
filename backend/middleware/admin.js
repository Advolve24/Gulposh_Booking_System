import User from "../models/User.js";

export async function adminOnly(req, res, next) {
  try {
    if (!req.user?.id) return res.status(401).json({ message: "Auth required" });
    const u = await User.findById(req.user.id).select("isAdmin");
    if (!u?.isAdmin) return res.status(403).json({ message: "Admins only" });
    next();
  } catch (e) {
    return res.status(401).json({ message: "Unauthorized" });
  }
}
