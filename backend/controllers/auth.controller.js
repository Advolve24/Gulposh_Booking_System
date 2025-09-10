import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { setSessionCookie, clearSessionCookie } from "../utils/session.js";

const normalizeEmail = (e = "") => String(e).trim().toLowerCase();

export const register = async (req, res) => {
  try {
    const { name, email, password, remember } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: "Email and password are required" });

    const normalizedEmail = normalizeEmail(email);
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) return res.status(400).json({ message: "Email already registered" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name: (name || "").trim(), email: normalizedEmail, passwordHash });

    const token = jwt.sign(
      { id: user._id, email: user.email, isAdmin: !!user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: "30m" }                   // short-lived access
    );

    // USER cookie (path "/"); session by default, persistent if remember === true
    setSessionCookie(res, "token", token, { path: "/", persistent: !!remember, days: 7 });

    res.json({ id: user._id, name: user.name, email: user.email, isAdmin: !!user.isAdmin });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Failed to register" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password, remember } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: "Email and password are required" });

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, email: user.email, isAdmin: !!user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: "30m" }
    );

    setSessionCookie(res, "token", token, { path: "/", persistent: !!remember, days: 7 });

    res.json({ id: user._id, name: user.name, email: user.email, isAdmin: !!user.isAdmin });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Failed to login" });
  }
};

export const logout = (_req, res) => {
  clearSessionCookie(res, "token", { path: "/" });
  res.json({ message: "Logged out" });
};

export const me = async (req, res) => {
  const u = await User.findById(req.user.id).select("name email isAdmin");
  if (!u) return res.status(401).json({ message: "Unauthorized" });
  res.json({ id: u._id, name: u.name, email: u.email, isAdmin: !!u.isAdmin });
};
