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
};

/* ===============================
   FIREBASE PHONE LOGIN
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

    let user = await User.findOne({
      $or: [{ firebaseUid }, { phone }],
    });

    let isNewUser = false;

    // 🔹 NEW USER
    if (!user) {
      user = await User.create({
        firebaseUid,
        phone,
        authProvider: "firebase",
        profileComplete: false, // 🔐 ONLY HERE
      });
      isNewUser = true;
    }

    // 🔹 LINK OLD USER
    else if (!user.firebaseUid) {
      user.firebaseUid = firebaseUid;
      user.authProvider = "firebase";
      await user.save();
    }

    issueSession(res, user);

    res.json({
      id: user._id,
      phone: user.phone,
      authProvider: user.authProvider,
      profileComplete: user.profileComplete,
      isNewUser, // 🔑 FRONTEND USES THIS
      isAdmin: !!user.isAdmin,
    });
  } catch (err) {
    console.error("firebaseLogin error:", err);
    res.status(401).json({ message: "Invalid Firebase token" });
  }
};


/* ===============================
   GOOGLE OAUTH LOGIN
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
    const email = payload.email?.toLowerCase() || null;
    const name = payload.name || null;

    let user = null;

    // 1️⃣ First priority: existing Google user
    user = await User.findOne({ googleId });

    // 2️⃣ Second priority: OTP user with same email
    if (!user && email) {
      user = await User.findOne({ email });
    }

    // 3️⃣ If user exists → LINK Google
    if (user) {
      if (!user.googleId) {
        user.googleId = googleId;
      }
      if (!user.email && email) {
        user.email = email;
      }
      if (!user.name && name) {
        user.name = name;
      }

      user.authProvider = "google";
      await user.save();
    }

    // 4️⃣ If truly new user → CREATE
    if (!user) {
      user = await User.create({
        googleId,
        email,
        name,
        authProvider: "google",
      });
    }

    issueSession(res, user);

    const isNewUser = !user.profileComplete;

    res.json({
      id: user._id,
      name: user.name,
      phone: user.phone,
      email: user.email,
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
      phone, // ✅ accept phone from frontend
      dob,
      address,
      country,
      state,
      city,
      pincode,
    } = req.body || {};

    const user = await User.findById(req.user.id);
    if (!user)
      return res.status(401).json({ message: "Unauthorized" });

    if (!name || !dob) {
      return res.status(400).json({
        message: "Name and Date of Birth are required",
      });
    }

    /* ===============================
       BASIC FIELDS
    ================================ */
    user.name = name.trim();
    user.email = email?.trim() || user.email;
    user.dob = new Date(dob);
    user.address = address || null;
    user.country = country || null;
    user.state = state || null;
    user.city = city || null;
    user.pincode = pincode || null;

    /* ===============================
       🔐 PHONE LOGIC (IMPORTANT)
    ================================ */
    if (user.authProvider === "google") {
      if (!phone) {
        return res.status(400).json({
          message: "Mobile number is required",
        });
      }

      // normalize phone
      const normalizedPhone = phone.replace(/\D/g, "").slice(-10);

      if (normalizedPhone.length !== 10) {
        return res.status(400).json({
          message: "Invalid mobile number",
        });
      }

      user.phone = normalizedPhone;
    }

    /* ===============================
       PROFILE COMPLETE FLAG
    ================================ */
    user.profileComplete = true;

    await user.save();

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
      profileComplete: user.profileComplete,
    });
  } catch (err) {
    console.error("updateMe error:", err);
    res.status(500).json({ message: "Failed to update profile" });
  }
};

