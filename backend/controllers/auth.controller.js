import jwt from "jsonwebtoken";
import User from "../models/User.js";
import admin from "../config/firebaseAdmin.js";
import { setSessionCookie, clearSessionCookie } from "../utils/session.js";

/* ===============================
   HELPERS
================================ */
const normalizePhone = (phone = "") =>
  phone.replace(/\D/g, "").slice(-10);

const createAccessToken = (user) =>
  jwt.sign(
    { id: user._id, isAdmin: !!user.isAdmin },
    process.env.JWT_SECRET,
    { expiresIn: "45m" }
  );

const createRefreshToken = (user) =>
  jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "10d" }
  );

/* ===============================
   FIREBASE OTP → LOGIN / SIGNUP
   POST /auth/firebase-login
================================ */
export const firebaseLogin = async (req, res) => {
  try {
    const hdr = req.headers.authorization || "";
    const idToken = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;

    if (!idToken)
      return res.status(401).json({ message: "Firebase token missing" });

    const decoded = await admin.auth().verifyIdToken(idToken);

    const firebaseUid = decoded.uid;
    const phone = normalizePhone(decoded.phone_number || "");

    if (!phone)
      return res.status(400).json({ message: "Phone number not available" });

    const { name, dob } = req.body || {};

    let user = await User.findOne({
      $or: [{ firebaseUid }, { phone }],
    });

    let isNewUser = false;

    // 🆕 NEW USER
    if (!user) {
      if (!name || !dob) {
        return res.status(400).json({
          code: "PROFILE_REQUIRED",
          message: "Name and Date of Birth are required",
        });
      }

      user = await User.create({
        firebaseUid,
        phone,
        name: String(name).trim(),
        dob: new Date(dob),
      });

      isNewUser = true;
    } else if (!user.firebaseUid) {
      user.firebaseUid = firebaseUid;
      await user.save();
    }

    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);

    setSessionCookie(res, "token", accessToken, {
      path: "/",
      persistent: false,
    });

    setSessionCookie(res, "refresh_token", refreshToken, {
      path: "/",
      persistent: true,
      days: 10,
    });

    res.json({
      id: user._id,
      name: user.name,
      phone: user.phone,
      email: user.email || null,
      dob: user.dob || null,
      isAdmin: !!user.isAdmin,
      isNewUser,
    });
  } catch (err) {
    console.error("firebaseLogin error:", err);
    res.status(401).json({ message: "Invalid Firebase token" });
  }
};

/* ===============================
   PHONE OTP → LOGIN / SIGNUP
   POST /auth/phone-login
================================ */
export const phoneLogin = async (req, res) => {
  try {
    const { phone, name, email, dob } = req.body || {};

    if (!phone)
      return res.status(400).json({ message: "Phone number is required" });

    const normalizedPhone = normalizePhone(phone);

    let user = await User.findOne({ phone: normalizedPhone });
    let isNewUser = false;

    if (!user) {
      if (!name || !dob) {
        return res.status(400).json({
          code: "PROFILE_REQUIRED",
          message: "Name and Date of Birth are required",
        });
      }

      user = await User.create({
        phone: normalizedPhone,
        name: String(name).trim(),
        email: email ? String(email).trim() : undefined,
        dob: new Date(dob),
      });

      isNewUser = true;
    }

    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);

    setSessionCookie(res, "token", accessToken, {
      path: "/",
      persistent: false,
    });

    setSessionCookie(res, "refresh_token", refreshToken, {
      path: "/",
      persistent: true,
      days: 10,
    });

    res.json({
      id: user._id,
      name: user.name,
      phone: user.phone,
      email: user.email || null,
      dob: user.dob || null,
      isAdmin: !!user.isAdmin,
      isNewUser,
    });
  } catch (err) {
    console.error("phoneLogin error:", err);
    res.status(500).json({ message: "Phone login failed" });
  }
};

/* ===============================
   LOGOUT
================================ */
export const logout = (_req, res) => {
  clearSessionCookie(res, "token", { path: "/" });
  clearSessionCookie(res, "refresh_token", { path: "/" });
  res.json({ message: "Logged out" });
};

/* ===============================
   REFRESH SESSION
================================ */
export const refreshSession = async (req, res) => {
  try {
    const token = req.cookies?.refresh_token;
    if (!token)
      return res.status(401).json({ message: "No refresh token" });

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user)
      return res.status(404).json({ message: "User not found" });

    const newAccessToken = createAccessToken(user);
    setSessionCookie(res, "token", newAccessToken, {
      path: "/",
      persistent: false,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("Refresh error:", err.message);
    res.status(401).json({ message: "Invalid or expired refresh token" });
  }
};

/* ===============================
   GET MY PROFILE
================================ */
export const me = async (req, res) => {
  const user = await User.findById(req.user.id).select(
    "name phone email dob isAdmin"
  );

  if (!user)
    return res.status(401).json({ message: "Unauthorized" });

  res.json({
    id: user._id,
    name: user.name,
    phone: user.phone,
    email: user.email || null,
    dob: user.dob || null,
    isAdmin: !!user.isAdmin,
  });
};

/* ===============================
   UPDATE PROFILE
================================ */
export const updateMe = async (req, res) => {
  try {
    const { name, email, dob } = req.body || {};
    const user = await User.findById(req.user.id);

    if (!user)
      return res.status(401).json({ message: "Unauthorized" });

    if (name !== undefined) user.name = String(name).trim();
    if (email !== undefined) user.email = String(email).trim();
    if (dob !== undefined) user.dob = dob ? new Date(dob) : null;

    await user.save();

    res.json({
      id: user._id,
      name: user.name,
      phone: user.phone,
      email: user.email || null,
      dob: user.dob || null,
      isAdmin: !!user.isAdmin,
    });
  } catch (err) {
    console.error("updateMe error:", err);
    res.status(500).json({ message: "Failed to update profile" });
  }
};
