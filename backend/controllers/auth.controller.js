import jwt from "jsonwebtoken";
import User from "../models/User.js";
import admin from "../config/firebaseAdmin.js";
import { OAuth2Client } from "google-auth-library";
import { setSessionCookie, clearSessionCookie } from "../utils/session.js";

/* ===============================
   HELPERS
================================ */

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

const issueSession = (res, user) => {
  setSessionCookie(res, "token", createAccessToken(user), {
    path: "/",
    persistent: false,
  });

  setSessionCookie(res, "refresh_token", createRefreshToken(user), {
    path: "/",
    persistent: true,
    days: 10,
  });
};

/* ===============================
   📱 PHONE OTP LOGIN
================================ */

export const phoneLogin = async (req, res) => {
  try {
    const hdr = req.headers.authorization || "";
    const idToken = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;

    if (!idToken)
      return res.status(401).json({ message: "Firebase token missing" });

    const decoded = await admin.auth().verifyIdToken(idToken);
    const phone = normalizePhone(decoded.phone_number);

    if (!phone)
      return res.status(400).json({ message: "Phone not found in token" });

    let user = await User.findOne({ phone });
    let isNewUser = false;

    if (!user) {
      user = await User.create({
        phone,
        authProvider: "phone",
      });
      isNewUser = true;
    }

    issueSession(res, user);

    res.json({
      id: user._id,
      phone: user.phone,
      authProvider: user.authProvider,
      profileComplete: user.profileComplete,
      isNewUser,
      isAdmin: !!user.isAdmin,
    });
  } catch (err) {
    console.error("phoneLogin error:", err);
    res.status(401).json({ message: "Invalid or expired OTP" });
  }
};

/* ===============================
   🌐 GOOGLE OAUTH LOGIN
================================ */

export const googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken)
      return res.status(400).json({ message: "Google token missing" });

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload.email?.toLowerCase();
    const name = payload.name || null;

    if (!email)
      return res.status(400).json({ message: "Email not found in Google token" });

    let user = await User.findOne({ email });
    let isNewUser = false;

    if (!user) {
      user = await User.create({
        email,
        name,
        authProvider: "google",
      });
      isNewUser = true;
    } else {
      // keep data fresh
      if (!user.name && name) {
        user.name = name;
        await user.save();
      }
    }

    issueSession(res, user);

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      authProvider: user.authProvider,
      profileComplete: user.profileComplete,
      isNewUser,
      isAdmin: !!user.isAdmin,
    });
  } catch (err) {
    console.error("googleLogin error:", err);
    res.status(401).json({ message: "Invalid Google token" });
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
   CURRENT USER
================================ */

export const me = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user)
    return res.status(401).json({ message: "Unauthorized" });

  res.json({
    id: user._id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    dob: user.dob,
    address: user.address,
    country: user.country,
    state: user.state,
    city: user.city,
    pincode: user.pincode,
    authProvider: user.authProvider,
    profileComplete: user.profileComplete,
    isAdmin: !!user.isAdmin,
  });
};

/* ===============================
   UPDATE PROFILE
================================ */

export const updateMe = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      dob,
      address,
      country,
      state,
      city,
      pincode,
    } = req.body;

    const user = await User.findById(req.user.id);
    if (!user)
      return res.status(401).json({ message: "Unauthorized" });

    if (!name || !dob)
      return res
        .status(400)
        .json({ message: "Name and Date of Birth are required" });

    user.name = name.trim();
    user.email = email?.trim() || user.email;
    user.dob = new Date(dob);
    user.address = address || null;
    user.country = country || null;
    user.state = state || null;
    user.city = city || null;
    user.pincode = pincode || null;

    // Google users MUST add phone
    if (user.authProvider === "google") {
      if (!phone)
        return res
          .status(400)
          .json({ message: "Mobile number is required" });

      const normalizedPhone = normalizePhone(phone);
      if (normalizedPhone.length !== 10)
        return res.status(400).json({ message: "Invalid mobile number" });

      user.phone = normalizedPhone;
    }

    await user.save();

    res.json({
      id: user._id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      profileComplete: user.profileComplete,
    });
  } catch (err) {
    console.error("updateMe error:", err);
    res.status(500).json({ message: "Failed to update profile" });
  }
};
