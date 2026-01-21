import express from "express";
import {
  phoneLogin,
  googleLogin,
  logout,
  me,
  updateMe,
  refresh,
} from "../controllers/auth.controller.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();

/* ===============================
   AUTH
================================ */

// Phone OTP → Backend session
router.post("/phone-login", phoneLogin);

// Google OAuth → Backend session
router.post("/google-login", googleLogin);

// 🔁 Refresh access token
router.post("/refresh", refresh); 


// Logout → clear cookies
router.post("/logout", logout);

/* ===============================
   PROFILE
================================ */

router.get("/me", authRequired, me);
router.put("/me", authRequired, updateMe);

export default router;
