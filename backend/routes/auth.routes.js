import express from "express";
import {
  firebaseLogin,
  logout,
  me,
  refreshSession,
  updateMe,
} from "../controllers/auth.controller.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();

/* ===============================
   AUTH
================================ */

// Firebase OTP → Backend JWT
router.post("/firebase-login", firebaseLogin);

// Logout + refresh
router.post("/logout", logout);
router.post("/refresh", refreshSession);

/* ===============================
   PROFILE
================================ */

router.get("/me", authRequired, me);
router.put("/me", authRequired, updateMe);

export default router;
