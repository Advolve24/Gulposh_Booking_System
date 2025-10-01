import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { setSessionCookie, clearSessionCookie } from "../utils/session.js";

const normalizeEmail = (e = "") => String(e).trim().toLowerCase();

export const adminLogin = async (req, res) => {
  const { email, password, remember } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: "Email and password are required" });

  const user = await User.findOne({ email: normalizeEmail(email) });
  if (!user || !user.isAdmin) return res.status(403).json({ message: "Admins only" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(400).json({ message: "Invalid credentials" });

  const token = jwt.sign(
    { id: user._id, email: user.email, isAdmin: true },
    process.env.JWT_SECRET,
    { expiresIn: "5m" }
  );

  setSessionCookie(res, "admin_token", token, { path: "/api/admin", persistent: !!remember, days: 7 });

  res.json({ id: user._id, name: user.name, email: user.email, isAdmin: true });
};

export const adminLogout = (_req, res) => {
  clearSessionCookie(res, "admin_token", { path: "/api/admin" });
  res.json({ message: "Logged out" });
};

export const adminMe = async (req, res) => {
  const u = await User.findById(req.user.id).select("name email isAdmin");
  if (!u?.isAdmin) return res.status(403).json({ message: "Admins only" });
  res.json({ id: u._id, name: u.name, email: u.email, isAdmin: true });
};
