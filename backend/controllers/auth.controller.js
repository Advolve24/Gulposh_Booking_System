import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { setSessionCookie, clearSessionCookie } from "../utils/session.js";

const normalizeEmail = (e = "") => String(e).trim().toLowerCase();
const normalizePhone = (p = "") => String(p).trim();

function createAccessToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, isAdmin: !!user.isAdmin },
    process.env.JWT_SECRET,
    { expiresIn: "45m" }
  );
}

function createRefreshToken(user) {
  return jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "10d" }
  );
}

// --- REGISTER ---
export const register = async (req, res) => {
  try {
    const { name, email, password, phone, remember } = req.body || {};
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ message: "Name, email, password, and phone are required" });
    }

    const normalizedEmail = normalizeEmail(email);
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) return res.status(400).json({ message: "Email already registered" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      phone: normalizePhone(phone),
    });

    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);

    setSessionCookie(res, "token", accessToken, { path: "/", persistent: false });
    setSessionCookie(res, "refresh_token", refreshToken, { path: "/", persistent: true, days: 10 });

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

// --- LOGIN ---
export const login = async (req, res) => {
  try {
    const { email, password, remember } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: "Email and password are required" });

    const user = await User.findOne({ email: normalizeEmail(email) });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(400).json({ message: "Invalid credentials" });

    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);

    setSessionCookie(res, "token", accessToken, { path: "/", persistent: false });
    setSessionCookie(res, "refresh_token", refreshToken, { path: "/", persistent: !!remember, days: 10 });

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      isAdmin: !!user.isAdmin,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Failed to login" });
  }
};

// --- REFRESH TOKEN ---
export const refreshSession = async (req, res) => {
  try {
    const token = req.cookies?.refresh_token;
    if (!token) return res.status(401).json({ message: "No refresh token" });

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const newAccessToken = createAccessToken(user);
    setSessionCookie(res, "token", newAccessToken, { path: "/", persistent: false });

    res.json({ ok: true });
  } catch (err) {
    console.error("Refresh error:", err.message);
    res.status(401).json({ message: "Invalid or expired refresh token" });
  }
};

// --- LOGOUT ---
export const logout = (_req, res) => {
  clearSessionCookie(res, "token", { path: "/" });
  clearSessionCookie(res, "refresh_token", { path: "/" });
  res.json({ message: "Logged out" });
};

// --- CURRENT USER ---
export const me = async (req, res) => {
  const u = await User.findById(req.user.id).select("name email phone isAdmin");
  if (!u) return res.status(401).json({ message: "Unauthorized" });
  res.json({ id: u._id, name: u.name, email: u.email, phone: u.phone, isAdmin: !!u.isAdmin });
};

// --- UPDATE PROFILE ---
export const updateMe = async (req, res) => {
  try {
    const { name, email, phone } = req.body || {};
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ message: "Unauthorized" });

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
    if (phone !== undefined) user.phone = String(phone).trim();

    await user.save();

    if (emailChanged) {
      const accessToken = createAccessToken(user);
      setSessionCookie(res, "token", accessToken, { path: "/", persistent: false });
    }

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      isAdmin: !!user.isAdmin,
    });
  } catch (err) {
    console.error("updateMe error:", err);
    res.status(500).json({ message: "Failed to update profile" });
  }
};

// --- CHANGE PASSWORD ---
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
