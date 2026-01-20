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
   FIREBASE PHONE LOGIN (OTP)
================================ */

export const firebaseLogin = async (req, res) => {
  try {
    const idToken =
      req.headers.authorization?.replace("Bearer ", "");

    if (!idToken)
      return res.status(401).json({ message: "Firebase token missing" });

    const decoded = await admin.auth().verifyIdToken(idToken);
    const firebaseUid = decoded.uid;
    const phone = normalizePhone(decoded.phone_number);

    if (!phone)
      return res.status(400).json({ message: "Phone not available" });

    let user = await User.findOne({
      $or: [{ firebaseUid }, { phone }],
    });

    let isNewUser = false;

    if (!user) {
      user = await User.create({
        firebaseUid,
        phone,
        authProviders: ["firebase"],
      });
      isNewUser = true;
    } else {
      if (!user.firebaseUid) user.firebaseUid = firebaseUid;
      if (!user.authProviders.includes("firebase"))
        user.authProviders.push("firebase");
      await user.save();
    }

    issueSession(res, user);

    res.json({
      id: user._id,
      phone: user.phone,
      email: user.email,
      emailVerified: user.emailVerified,
      authProviders: user.authProviders,
      profileComplete: user.profileComplete,
      isNewUser,
      isAdmin: !!user.isAdmin,
    });
  } catch (err) {
    console.error("firebaseLogin error:", err);
    res.status(401).json({ message: "Invalid Firebase token" });
  }
};

/* ===============================
   GOOGLE LOGIN (EMAIL VERIFIER)
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
    const googleId = payload.sub;
    const email = payload.email?.toLowerCase();
    const name = payload.name;

    let user =
      (await User.findOne({ googleId })) ||
      (email ? await User.findOne({ email }) : null);

    let isNewUser = false;

    if (!user) {
      user = await User.create({
        googleId,
        email,
        name,
        emailVerified: true,
        authProviders: ["google"],
      });
      isNewUser = true;
    } else {
      if (!user.googleId) user.googleId = googleId;
      if (!user.email) user.email = email;
      user.emailVerified = true;

      if (!user.authProviders.includes("google"))
        user.authProviders.push("google");

      if (!user.name && name) user.name = name;

      await user.save();
    }

    issueSession(res, user);

    res.json({
      id: user._id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      emailVerified: user.emailVerified,
      authProviders: user.authProviders,
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
   REFRESH SESSION
================================ */

export const refreshSession = async (req, res) => {
  try {
    const token = req.cookies?.refresh_token;
    if (!token) return res.status(401).json({ message: "No refresh token" });

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    setSessionCookie(res, "token", createAccessToken(user), {
      path: "/",
      persistent: false,
    });

    res.json({ ok: true });
  } catch {
    res.status(401).json({ message: "Invalid refresh token" });
  }
};

/* ===============================
   CURRENT USER
================================ */

export const me = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  res.json({
    id: user._id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    emailVerified: user.emailVerified,
    dob: user.dob,
    address: user.address,
    country: user.country,
    state: user.state,
    city: user.city,
    pincode: user.pincode,
    authProviders: user.authProviders,
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
      dob,
      address,
      country,
      state,
      city,
      pincode,
    } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    if (!name || !dob)
      return res.status(400).json({
        message: "Name and Date of Birth are required",
      });

    user.name = name.trim();
    user.dob = new Date(dob);
    user.address = address || null;
    user.country = country || null;
    user.state = state || null;
    user.city = city || null;
    user.pincode = pincode || null;

    await user.save();

    res.json({
      id: user._id,
      profileComplete: user.profileComplete,
    });
  } catch (err) {
    console.error("updateMe error:", err);
    res.status(500).json({ message: "Failed to update profile" });
  }
};
