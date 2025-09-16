import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { setSessionCookie, clearSessionCookie } from "../utils/session.js";

const normalizeEmail = (e = "") => String(e).trim().toLowerCase();
const normalizePhone = (p = "") => String(p).trim();

export const register = async (req, res) => {
  try {
    const { name, email, password, phone, remember } = req.body || {};
    if (!name|| !email || !password || !phone) {
      return res.status(400).json({ message: "Name, email, password and phone are required" });
    }

    const normalizedEmail = normalizeEmail(email);
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) return res.status(400).json({ message: "Email already registered" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: (name || "").trim(),
      email: normalizedEmail,
      passwordHash,
      phone: normalizePhone(phone),
    });

    const token = jwt.sign(
      { id: user._id, email: user.email, isAdmin: !!user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: "30m" }
    );

    setSessionCookie(res, "token", token, { path: "/", persistent: !!remember, days: 7 });

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      isAdmin: !!user.isAdmin,
    });
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

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,          // include phone in login response too
      isAdmin: !!user.isAdmin,
    });
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
  const u = await User.findById(req.user.id).select("name email phone isAdmin");
  if (!u) return res.status(401).json({ message: "Unauthorized" });
  res.json({ id: u._id, name: u.name, email: u.email, phone: u.phone, isAdmin: !!u.isAdmin });
};


export const updateMe = async (req, res) => {
  try {
    const { name, email, phone } = req.body || {};
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    // If email provided and changed, ensure unique
    let emailChanged = false;
    if (email !== undefined) {
      const newEmail = normalizeEmail(email);
      if (newEmail !== user.email) {
        const exists = await User.findOne({ email: newEmail, _id: { $ne: user._id } }).lean();
        if (exists) return res.status(400).json({ message: "Email already in use" });
        user.email = newEmail;
        emailChanged = true;
      }
    }

    if (name !== undefined) user.name = String(name).trim();

    if (phone !== undefined) {
      const v = String(phone).trim();
      user.phone = v;
      user.mobile = v;       // keep legacy field in sync
    }

    await user.save();

    // If email changed, refresh JWT so cookie matches
    if (emailChanged) {
      const token = jwt.sign(
        { id: user._id, email: user.email, isAdmin: !!user.isAdmin },
        process.env.JWT_SECRET,
        { expiresIn: "30m" }
      );
      setSessionCookie(res, "token", token, { path: "/", persistent: true, days: 7 });
    }

    res.json({
      id: user._id,
      name: user.name || "",
      email: user.email || "",
      phone: user.phone ?? user.mobile ?? "",
      isAdmin: !!user.isAdmin,
      createdAt: user.createdAt,
    });
  } catch (err) {
    console.error("updateMe error:", err);
    res.status(500).json({ message: "Failed to update profile" });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Both current and new password are required" });
    }
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) return res.status(400).json({ message: "Current password is incorrect" });

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ ok: true });
  } catch (err) {
    console.error("changePassword error:", err);
    res.status(500).json({ message: "Failed to change password" });
  }
};
